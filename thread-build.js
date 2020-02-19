const { workerData, parentPort } = require('worker_threads')
const fs = require('fs');
const path = require('path');
const jsonfile = require('jsonfile');
const log4js = require('log4js');
const chalk = require('chalk');
const { spawn } = require('child_process');

process.setMaxListeners(30);

const httpClient = require('./httpClient');

const SLACK_URL = process.env.SLACK_URL;

/**
 * @type {[{name:string,url:string,node:boolean,short:string,dependency:string[]}]}
 */
const repoList = jsonfile.readFileSync(path.join(__dirname, 'repo-list.json'));

// /**
//  * 
//  * @param {{release:string,workspace:string}} options 
//  */
// function trigger(options) {
const options = workerData;
for (let repo of repoList) {
    if (repo.disabled) {
        continue;
    }
    options.logname = Date.now();
    const logPath = repo.name + '.' + options.logname;
    // const logger = log4js.getLogger(logPath);
    let script = ['#!/bin/bash'];
    let CLEAN_BUILD;
    if (fs.existsSync(`CLEAN_BUILD_${repo.short.toUpperCase()}`)) {
        CLEAN_BUILD = true;
    }
    if (CLEAN_BUILD && repo.dependency && repo.dependency.length > 0) {
        for (let i = 0; i < repo.dependency.length; i++) {
            const dep = repo.dependency[i];
            const tempRepo = repoList.find(e => e.name === dep);
            script.push(`cd ${options.workspace}`);
            script.push(`echo "${chalk.green('***********************************')}"`);
            script.push(`echo "${chalk.green(`BUILD STARTED FOR DEPENDENCY :: ${dep}`)}"`);
            script.push(`echo "${chalk.green('***********************************')}"`);
            buildImage(tempRepo, options, script);
            script.push(`echo "${chalk.green('***********************************')}"`);
            script.push(`echo "${chalk.green(`BUILD ENDED FOR DEPENDENCY :: ${dep}`)}"`);
            script.push(`echo "${chalk.green('***********************************')}"`);
        }
    }
    script.push(`echo "${chalk.green('***********************************')}"`);
    script.push(`echo "${chalk.green(`PROCESS STARTED FOR :: ${repo.name}`)}"`);
    script.push(`echo "${chalk.green('***********************************')}"`);
    script.push(`cd ${options.workspace}`);
    buildImage(repo, options, script);
    script.push(`echo "${chalk.green('***********************************')}"`);
    script.push(`echo "${chalk.green(`PROCESS ENDED FOR :: ${repo.name}`)}"`);
    script.push(`echo "${chalk.green('***********************************')}"`);
    const logs = spawn(script.join('\n'), {
        shell: true
    });
    fs.writeFileSync(path.join('./logs', logPath + '.log'), '');
    logs.stderr.on('data', function (chunk) {
        fs.appendFileSync(path.join('./logs', logPath + '.log'), chunk);
    });
    logs.stdout.on('data', function (chunk) {
        fs.appendFileSync(path.join('./logs', logPath + '.log'), chunk);
    });
    logs.on('exit', function (chunk) {
        httpClient.post(SLACK_URL, {
            body: {
                text: '*' + repo.name + '* BUILD SUCCESSFUL',
                attachments: [
                    {
                        title: 'Build Log',
                        title_link: `https://cicd.odp.appveen.com/${logPath}.log`
                    }
                ]
            }
        }).then(data => {
            fs.appendFileSync(path.join('./logs', logPath + '.log'), data);
        }).catch(err => {
            fs.appendFileSync(path.join('./logs', logPath + '.log'), err);
        });
    });
}
// }

/**
 * 
 * @param {{name:string,url:string,node:boolean,short:string,dependency:string[]}} repo 
 * @param {*} options 
 * @param {string[]} script
 */
function buildImage(repo, options, script) {
    const ODP_RELEASE = options.release;
    if (fs.existsSync(repo.name)) {
        let lastPull;
        if (fs.existsSync(`LAST_PULL_${repo.name.toUpperCase()}`)) {
            lastPull = fs.readFileSync(path.join(options.workspace, `LAST_PULL_${repo.name.toUpperCase()}`), 'utf-8');
        }
        if (!lastPull) {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            lastPull = date.toISOString();
        }
        script.push(`cd ${repo.name}`);
        script.push(`git stash`);
        script.push(`git checkout dev`);
        script.push(`git pull`);
        if (lastPull) {
            script.push(`echo "${chalk.green('***********************************')}"`);
            script.push(`echo "${chalk.green(`Changes found`)}"`);
            script.push(`echo "${chalk.green('***********************************')}"`);
            script.push(`git log --pretty=oneline --since="${lastPull}"`);
            script.push(`echo "${chalk.green('***********************************')}"`);
        }
        script.push(`echo ${new Date().toISOString()} > ../LAST_PULL_${repo.name.toUpperCase()}`);
    } else {
        script.push(`git clone ${repo.url}`);
        script.push(`cd ${repo.name}`);
        script.push(`git checkout dev`);
        script.push(`echo ${new Date().toISOString()} > ../LAST_PULL_${repo.name.toUpperCase()}`);
    }
    script.push(`export WORKSPACE=${options.workspace}/${repo.name}`);
    script.push(`if [ -f scripts/build_image.sh ]; then`);
    script.push(`  sh scripts/build_image.sh ${ODP_RELEASE} `);
    script.push(`else`);
    script.push(`  if [ -f scripts/build_jar.sh ]; then`);
    script.push(`    sh scripts/build_jar.sh `);
    script.push(`  elif [ -f scripts/setup.sh ]; then`);
    script.push(`    sh scripts/setup.sh `);
    script.push(`  elif [ -f scripts/build_executables.sh ]; then`);
    script.push(`    sh scripts/build_executables.sh `);
    script.push(`  fi`);
    script.push(`fi`);
}

/**
 * 
 * @param {string} script 
 */
function executeScript(script) {
    return new Promise((resolve, reject) => {
        const data = [];
        const p = exec(script);
        p.stderr.on('data', function (chunk) {
            data.push(chunk);
        });
        p.stdout.on('data', function (chunk) {
            data.push(chunk);
        });
        p.stdout.on('end', function () {
            resolve(data.join('').toString());
        });
        p.stdout.on('error', function (err) {
            reject(err.message);
        });
    });
}