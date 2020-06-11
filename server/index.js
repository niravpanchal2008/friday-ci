const os = require('os');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const shell = require('shelljs');
const makeDir = require('make-dir');
const jsonfile = require('jsonfile');
const inquirer = require('inquirer');
const dateformat = require('dateformat');

const release = require('./release');
const hotfix = require('./hotfix');
const freshBuild = require('./fresh-build');

let defaultTag;

if (!process.env.JAVA_HOME) {
    console.log(chalk.cyan('***********************************'));
    console.log(chalk.red('JAVA_HOME not found, please set JAVA_HOME'));
    console.log(chalk.cyan('***********************************'));
    process.exit();
}

if (!process.env.MAVEN_HOME) {
    console.log(chalk.cyan('***********************************'));
    console.log(chalk.red('MAVEN_HOME not found, please set MAVEN_HOME'));
    console.log(chalk.cyan('***********************************'));
    process.exit();
}

if (!process.env.M2_HOME) {
    console.log(chalk.cyan('***********************************'));
    console.log(chalk.red('M2_HOME not found, please set M2_HOME'));
    console.log(chalk.cyan('***********************************'));
    process.exit();
}

const repoFileLocation = path.join(process.cwd(), 'repo-list.json');
const configFileLocation = path.join(process.cwd(), 'config.json');

if (!fs.existsSync(configFileLocation)) {
    fs.writeFileSync(configFileLocation, '{"repoAccess":{ "username":"", "password":""},"workspace":""}', 'utf8');
}

/**
 * @type {[{name:string,url:string,node:boolean,short:string,dependency:string[]}]}
 */
const repoList = jsonfile.readFileSync(repoFileLocation);
const config = jsonfile.readFileSync(configFileLocation);
const defaultWorkspace = config.workspace || path.join(os.homedir(), 'orcli_workspace');


console.log(chalk.cyan('***********************************'));
console.log(chalk.green('Welcome to ODP Release CLI'));
console.log(chalk.cyan('***********************************'));
console.log('');
inquirer
    .prompt([
        {
            type: 'input',
            name: 'workspace',
            message: 'Please enter workspace location',
            default: defaultWorkspace
        },
        {
            type: 'list',
            name: 'releaseType',
            message: 'Please select release type',
            choices: [
                'New Release',
                'Fresh Build',
                'Hotfix'
            ]
        },
        {
            when: function (response) {
                return response.releaseType === 'New Release';
            },
            type: 'input',
            name: 'release',
            message: 'Please enter release version'
        }, {
            when: function (response) {
                return response.releaseType === 'Fresh Build' || response.releaseType === 'Hotfix';
            },
            type: 'input',
            name: 'branch',
            message: 'Please enter branch'
        },
        {
            when: function (response) {
                return response.releaseType === 'Hotfix' || response.releaseType === 'Fresh Build';
            },
            type: 'list',
            name: 'repo',
            message: 'Please select a repo for hotfix',
            choices: repoList
        },
        {
            when: function (response) {
                return response.releaseType === 'Hotfix' || response.releaseType === 'Fresh Build';
            },
            type: 'confirm',
            name: 'cleanBuild',
            message: 'You want to do clean build'
        },
        {
            when: function (response) {
                return response.releaseType === 'Hotfix';
            },
            type: 'input',
            name: 'hotfix',
            message: 'Please enter hotfix number'
        },
        {
            when: function (response) {
                defaultTag = response.branch;
                return response.releaseType === 'Fresh Build';
            },
            type: 'input',
            name: 'tag',
            message: 'Please enter image tag',
            default: defaultTag
        },
        // {
        //     type: 'confirm',
        //     name: 'push',
        //     message: 'Do you want to push this image to e-delivery?'
        // },
        // {
        //     when: function (response) {
        //         return response.push;
        //     },
        //     type: 'input',
        //     name: 'deliveryLocation',
        //     message: 'Please enter e-delivery location',
        //     default: function (response) {
        //         if(response.releaseType === 'Hotfix'){
        //             return `/home/ubuntu/e-delivery/Releases/ODP/${response.branch}/Hotfix`
        //         } else {
        //             return `/home/ubuntu/e-delivery/Releases/ODP/${response.release}/Images`
        //         }
        //     }
        // }
    ])
    .then(answers => {
        config.workspace = answers.workspace;
        jsonfile.writeFileSync(configFileLocation, config);
        answers.workspace = path.join(__dirname, path.relative(__dirname, answers.workspace));
        if (answers.releaseType == 'New Release') {
            answers.workspace = path.join(answers.workspace, answers.release);
        } else {
            answers.workspace = path.join(answers.workspace, answers.branch);
        }
        const date = new Date();
        answers.saveLocation = path.join(answers.workspace, 'images', dateformat(date, 'yyyy_mm_dd'));
        makeDir.sync(answers.workspace);
        makeDir.sync(answers.saveLocation);
        makeDir.sync(path.join(answers.saveLocation, 'yamls'));
        shell.cd(answers.workspace);
        if (answers.releaseType == 'New Release') {
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`RELEASE STARTED :: ${answers.release}`));
            console.log(chalk.cyan('***********************************'));
            release.trigger(answers);
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`RELEASE ENDED :: ${answers.release}`));
            console.log(chalk.cyan('***********************************'));
        } else if (answers.releaseType == 'Fresh Build') {
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`FRESH BUILD STARTED :: ${answers.branch}`));
            console.log(chalk.cyan('***********************************'));
            freshBuild.trigger(answers);
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`FRESH BUILD ENDED :: ${answers.branch}`));
            console.log(chalk.cyan('***********************************'));
        } else {
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`HOTFIX STARTED :: ${answers.repo} ${answers.branch} hotfix ${answers.hotfix}`));
            console.log(chalk.cyan('***********************************'));
            hotfix.trigger(answers);
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`HOTFIX ENDED :: ${answers.repo} ${answers.branch} hotfix ${answers.hotfix}`));
            console.log(chalk.cyan('***********************************'));
        }
        console.log(chalk.cyan('***********************************'));
        console.log(chalk.cyan('***********************************'));
        console.log(chalk.green(`IMAGES AT :: ${answers.saveLocation}`));
        console.log(chalk.cyan('***********************************'));
        console.log(chalk.cyan('***********************************'));
    });