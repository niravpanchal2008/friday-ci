const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const log4js = require('log4js');
const schedule = require('node-schedule');
const mkdirp = require('mkdirp');
const dotenv = require('dotenv');
const { Worker } = require('worker_threads');

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const buildUtils = require('./build');

const PORT = process.env.PORT || 8080;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const WORKSPACE = process.env.WORKSPACE;
let RELEASE = process.env.RELEASE;

const logger = log4js.getLogger('cicd-server');
let job;

global.workspace = WORKSPACE || path.join(process.cwd(), 'workspace');
mkdirp.sync(global.workspace);
if (!RELEASE && fs.existsSync(path.join(global.workspace, 'RELEASE'))) {
    const data = fs.readFileSync(path.join(global.workspace, 'RELEASE'), 'utf-8');
    if (data) {
        RELEASE = data;
    }
}
if (!RELEASE) {
    RELEASE = 'beta';
}

log4js.configure({
    appenders: { 'out': { type: 'stdout' }, server: { type: 'multiFile', base: 'logs/', property: 'categoryName', extension: '.log', maxLogSize: 10485760, backups: 3, compress: true } },
    categories: { default: { appenders: ['out', 'server'], level: LOG_LEVEL } }
});

if (!process.env.JAVA_HOME) {
    logger.error(('**********************************************'));
    logger.error(('JAVA_HOME not found, please set JAVA_HOME'));
    logger.error(('**********************************************'));
    process.exit();
}

if (!process.env.MAVEN_HOME) {
    logger.error(('**********************************************'));
    logger.error(('MAVEN_HOME not found, please set MAVEN_HOME'));
    logger.error(('**********************************************'));
    process.exit();
}

// if (!process.env.M2_HOME) {
//     logger.error(('**********************************************'));
//     logger.error(('M2_HOME not found, please set M2_HOME'));
//     logger.error(('**********************************************'));
//     process.exit();
// }

const app = express();

app.use(express.static(path.join(__dirname, 'logs')));
app.use(bodyParser.json());

app.use((req, res, next) => {
    logger.info(req.method, req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.path);
    next();
});

if (process.env.NODE_ENV !== 'production') {
    app.get('/cicd/test', (req, res) => {
        res.status(200).json({
            message: 'Build Started'
        });
        const worker = new Worker('./thread-build.js', {
            workerData: {
                release: RELEASE,
                workspace: global.workspace
            },
            stdout: true
        });
        worker.stdout.on('data', function (chunk) {

        });
        worker.stdout.on('end', function () {

        });
    });
}

app.get('/cicd', (req, res) => {
    const files = fs.readdirSync(path.join(__dirname, 'logs'));
    let html = `<ul>${files.map(e => `<li><a href="/${e}">${e}</a></li>`).join('\n')}</ul>`
    res.header('Content-Type','text/html');
    res.status(200).end(html);
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
        job = schedule.scheduleJob(cron, function (fireDate) {
            logger.info('Build Started AT:', fireDate);
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
                fs.writeFileSync(path.join(global.workspace, 'CLEAR_BUILD_' + repo.short), 'true', 'utf-8');
            }
        });
        res.status(200).json({
            message: 'Clean Build Configured'
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