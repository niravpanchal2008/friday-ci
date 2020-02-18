const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const shell = require('shelljs');
const jsonfile = require('jsonfile');
const log4js = require('log4js');

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
        const logger = log4js.getLogger(repo.name);
        let CLEAN_BUILD;
        if (fs.existsSync(`CLEAN_BUILD_${repo.short.toUpperCase()}`)) {
            CLEAN_BUILD = true;
        }
        if (CLEAN_BUILD && repo.dependency && repo.dependency.length > 0) {
            for (let i = 0; i < repo.dependency.length; i++) {
                shell.cd(options.workspace);
                const dep = repo.dependency[i];
                logger.info(chalk.green('***********************************'));
                logger.info(chalk.green(`BUILD STARTED FOR DEPENDENCY :: ${dep}`));
                logger.info(chalk.green('***********************************'));
                const tempRepo = repoList.find(e => e.name === dep);
                buildImage(tempRepo, options);
                logger.info(chalk.green('***********************************'));
                logger.info(chalk.green(`BUILD ENDED FOR DEPENDENCY :: ${dep}`));
                logger.info(chalk.green('***********************************'));
            }
        }
        logger.info(chalk.green('***********************************'));
        logger.info(chalk.green(`PROCESS STARTED FOR :: ${repo.name}`));
        logger.info(chalk.green('***********************************'));
        shell.cd(options.workspace);
        buildImage(repo, options);
        logger.info(chalk.green('***********************************'));
        logger.info(chalk.green(`PROCESS ENDED FOR :: ${repo.name}`));
        logger.info(chalk.green('***********************************'));
    }
    // saveOtherImages(options);
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
            logger.info(chalk.green(''));
            logger.info(chalk.green('***********************************'));
            logger.info(chalk.green(`Changes found`));
            logger.info(chalk.green('***********************************'));
            shell.exec(`git log --pretty=oneline --since="${lastPull}"`);
            logger.info(chalk.green('***********************************'));
            logger.info(chalk.green(''));
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
        shell.exec(`sh scripts/build_image.sh ${ODP_RELEASE}`);
    } else {
        if (fs.existsSync('scripts/build_jar.sh')) {
            shell.exec(`sh scripts/build_jar.sh`);
        }
        if (fs.existsSync('scripts/setup.sh')) {
            shell.exec(`sh scripts/setup.sh`);
        }
        if (fs.existsSync('scripts/build_executables.sh')) {
            shell.exec(`sh scripts/build_executables.sh`);
        }
    }
}

module.exports.trigger = trigger;