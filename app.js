const os = require('os');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const express = require('express');
const bodyParser = require('body-parser');
const log4js = require('log4js');
const schedule = require('node-schedule');
const shell = require('shelljs');

const buildUtils = require('./build');

const PORT = process.env.PORT || 8080;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const RELEASE = process.env.RELEASE || 'info';

const logger = log4js.getLogger('cicd-server');
let job;

global.workspace = path.join(os.homedir(), 'cicd');

log4js.configure({
    appenders: { 'out': { type: 'stdout' }, server: { type: 'multiFile', base: 'logs/', property: 'categoryName', extension: '.log', maxLogSize: 10485760, backups: 3, compress: true } },
    categories: { default: { appenders: ['out', 'server'], level: LOG_LEVEL } }
});

if (!process.env.JAVA_HOME) {
    logger.info(chalk.red('**********************************************'));
    logger.info(chalk.red('JAVA_HOME not found, please set JAVA_HOME'));
    logger.info(chalk.red('**********************************************'));
    process.exit();
}

if (!process.env.MAVEN_HOME) {
    logger.info(chalk.red('**********************************************'));
    logger.info(chalk.red('MAVEN_HOME not found, please set MAVEN_HOME'));
    logger.info(chalk.red('**********************************************'));
    process.exit();
}

if (!process.env.M2_HOME) {
    logger.info(chalk.red('**********************************************'));
    logger.info(chalk.red('M2_HOME not found, please set M2_HOME'));
    logger.info(chalk.red('**********************************************'));
    process.exit();
}

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

app.use((req, res, next) => {
    logger.info(req.method, req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.path);
    next();
});

app.get('/cicd/:id', (req, res) => {
    res.status(200).json({
        message: 'Fetched'
    });
});

app.post('/cicd/schedule', (req, res) => {
    try {
        if (job) {
            job.cancel();
            job = null;
        }
        const cron = '0 7-19/2 * * 1-5';
        if (req.body.cron) {
            cron = req.body.cron;
        }
        job = schedule.scheduleJob(cron, function () {
            buildUtils.trigger({
                release: RELEASE,
                workspace: global.workspace
            });
        });
    } catch (e) {
        logger.error(e);
        res.status(500).json({
            message: e.message
        });
    }
});

app.delete('/cicd/schedule', (req, res) => {
    try {
        if (job) {
            job.cancel();
        }
        job = null;
    } catch (e) {
        logger.error(e);
        res.status(500).json({
            message: e.message
        });
    }
});

app.put('/cicd/toggleBuild', (req, res) => {
    try {
        const toggleFile = path.join(global.workspace, 'TOGGLE');
        if (req.body.enable) {
            fs.unlinkSync(toggleFile);
        } else {
            fs.writeFileSync(toggleFile, 'true', 'utf-8');
        }
        res.status(200).json({
            message: 'Build ' + (req.body.enable ? 'Enabled' : 'Disabled')
        });
    } catch (e) {
        logger.error(e);
        res.status(500).json({
            message: e.message
        });
    }
});

app.put('/cicd/cleanBuild', (req, res) => {
    try {
        if (!req.body.repoList || !Array.isArray(req.body.repoList) || req.body.repoList.length === 0) {
            return res.status(400).json({
                message: 'Invalid Repo List'
            });
        }
        const repoList = JSON.parse(fs.readFileSync('repo-list.json', 'utf-8'));
        req.body.repoList.forEach(name => {
            const repo = repoList.find(e => e.name == name);
            if (repo) {
                shell.cd(path.join(global.workspace, repo.name));
                shell.touch('CLEAR_BUILD_' + repo.short);
                shell.cd(global.workspace);
            }
        });
    } catch (e) {
        logger.error(e);
        res.status(500).json({
            message: e.message
        });
    }
});

app.listen(PORT, (err) => {
    if (!err) {
        logger.info('Server is listening on port', PORT);
    } else {
        logger.error(err);
    }
});