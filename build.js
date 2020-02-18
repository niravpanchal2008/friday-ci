const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const jsonfile = require('jsonfile');
const log4js = require('log4js');

const httpClient = require('./httpClient');

const SLACK_URL = process.env.SLACK_URL;

/**
 * @type {[{name:string,url:string,node:boolean,short:string,dependency:string[]}]}
 */
const repoList = jsonfile.readFileSync(path.join(__dirname, 'repo-list.json'));

/**
 * 
 * @param {{release:string,workspace:string}} options 
 */
function trigger(options) {
    const ODP_RELEASE = options.release;
    shell.pwd()
    for (let repo of repoList) {
        if (repo.disabled) {
            continue;
        }
        const logPath = path.join(process.cwd(), 'logs', repo.name + '.log');
        if (fs.existsSync(logPath)) {
            const timestamp = Date.now();
            shell.mv(logPath, logPath + '.' + timestamp);
        }
        const logger = log4js.getLogger(repo.name);
        let CLEAN_BUILD;
        if (fs.existsSync(`CLEAN_BUILD_${repo.short.toUpperCase()}`)) {
            CLEAN_BUILD = true;
        }
        if (CLEAN_BUILD && repo.dependency && repo.dependency.length > 0) {
            for (let i = 0; i < repo.dependency.length; i++) {
                shell.cd(options.workspace);
                const dep = repo.dependency[i];
                logger.info(('***********************************'));
                logger.info((`BUILD STARTED FOR DEPENDENCY :: ${dep}`));
                logger.info(('***********************************'));
                const tempRepo = repoList.find(e => e.name === dep);
                buildImage(tempRepo, options);
                logger.info(('***********************************'));
                logger.info((`BUILD ENDED FOR DEPENDENCY :: ${dep}`));
                logger.info(('***********************************'));
            }
        }
        logger.info(('***********************************'));
        logger.info((`PROCESS STARTED FOR :: ${repo.name}`));
        logger.info(('***********************************'));
        const out = shell.cd(options.workspace);
        if (out.stderr) {
            logger.error(out.stderr);
        } else {
            logger.info(out.stdout);
        }
        buildImage(repo, options);
        logger.info(('***********************************'));
        logger.info((`PROCESS ENDED FOR :: ${repo.name}`));
        logger.info(('***********************************'));
        httpClient.post(SLACK_URL, {
            body: {
                text: '*' + repo.name + '* BUILD SUCCESSFUL',
                attachments: [
                    {
                        title: 'Build Log',
                        title_link: `https://cicd.odp.appveen.com/cicd/logs/${repo.name}.log`
                    }
                ]
            }
        });
    }
}

/**
 * 
 * @param {{name:string,url:string,node:boolean,short:string,dependency:string[]}} repo 
 * @param {*} options 
 */
function buildImage(repo, options) {
    const logger = log4js.getLogger(repo.name);
    const ODP_RELEASE = options.release;
    if (fs.existsSync(repo.name)) {
        let lastPull;
        if (fs.existsSync(`LAST_PULL_${repo.name.toUpperCase()}`)) {
            lastPull = shell.cat(`LAST_PULL_${repo.name.toUpperCase()}`);
        }
        if (!lastPull) {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            lastPull = date.toISOString();
        }
        shell.cd(repo.name);
        shell.env['WORKSPACE'] = shell.pwd();
        shell.exec(`git stash`);
        shell.exec(`git checkout dev`);
        shell.exec(`git pull`);
        if (lastPull) {
            logger.info((''));
            logger.info(('***********************************'));
            logger.info((`Changes found`));
            logger.info(('***********************************'));
            const out = shell.exec(`git log --pretty=oneline --since="${lastPull}"`);
            if (out.stderr) {
                logger.error(out.stderr);
            } else {
                logger.info(out.stdout);
            }
            logger.info(('***********************************'));
            logger.info((''));
        }
        shell.exec(`echo ${new Date().toISOString()} > ../LAST_PULL_${repo.name.toUpperCase()}`);
    } else {
        shell.exec(`git clone ${repo.url}`);
        shell.cd(repo.name);
        shell.env['WORKSPACE'] = shell.pwd();
        shell.exec(`git checkout dev`);
        shell.exec(`echo ${new Date().toISOString()} > ../LAST_PULL_${repo.name.toUpperCase()}`);
    }
    if (fs.existsSync('scripts/build_image.sh')) {
        const out = shell.exec(`sh scripts/build_image.sh ${ODP_RELEASE}`);
        if (out.stderr) {
            logger.error(out.stderr);
        } else {
            logger.info(out.stdout);
        }
    } else {
        if (fs.existsSync('scripts/build_jar.sh')) {
            const out = shell.exec(`sh scripts/build_jar.sh`);
            if (out.stderr) {
                logger.error(out.stderr);
            } else {
                logger.info(out.stdout);
            }
        }
        if (fs.existsSync('scripts/setup.sh')) {
            const out = shell.exec(`sh scripts/setup.sh`);
            if (out.stderr) {
                logger.error(out.stderr);
            } else {
                logger.info(out.stdout);
            }
        }
        if (fs.existsSync('scripts/build_executables.sh')) {
            const out = shell.exec(`sh scripts/build_executables.sh`);
            if (out.stderr) {
                logger.error(out.stderr);
            } else {
                logger.info(out.stdout);
            }
        }
    }
}

module.exports.trigger = trigger;