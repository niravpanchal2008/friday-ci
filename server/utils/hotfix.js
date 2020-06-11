const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const shell = require('shelljs');
const jsonfile = require('jsonfile');

/**
 * @type {[{name:string,url:string,node:boolean,short:string,dependency:string[]}]}
 */
const repoList = jsonfile.readFileSync(path.join(process.cwd(), 'repo-list.json'));

function trigger(answers) {
    shell.rm('-rf', 'ODP_RELEASE');
    shell.rm('-rf', 'BRANCH');
    const ODP_RELEASE = answers.patch || answers.branch;
    shell.exec(`echo ${ODP_RELEASE} > ODP_RELEASE`);
    shell.exec(`echo ${answers.branch} > BRANCH`);
    shell.pwd()
    const repo = repoList.find(e => e.name === answers.repo);
    if (repo.dependency && repo.dependency.length > 0) {
        for (let i = 0; i < repo.dependency.length; i++) {
            shell.cd(answers.workspace);
            const dep = repo.dependency[i];
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`BUILD STARTED FOR DEPENDENCY :: ${dep}`));
            console.log(chalk.cyan('***********************************'));
            const tempRepo = repoList.find(e => e.name === dep);
            buildImage(tempRepo, answers);
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`BUILD ENDED FOR DEPENDENCY :: ${dep}`));
            console.log(chalk.cyan('***********************************'));
        }
    }
    shell.cd(answers.workspace);
    console.log(chalk.cyan('***********************************'));
    console.log(chalk.green(`PROCESS STARTED FOR :: ${repo.name}`));
    console.log(chalk.cyan('***********************************'));
    buildImage(repo, answers);
    console.log(chalk.cyan('***********************************'));
    console.log(chalk.green(`PROCESS ENDED FOR :: ${repo.name}`));
    console.log(chalk.cyan('***********************************'));
}

/**
 * 
 * @param {{name:string,url:string,node:boolean,short:string,dependency:string[]}} repo 
 * @param {*} answers 
 */
function buildImage(repo, answers) {
    const ODP_RELEASE = answers.patch || answers.branch;
    if (repo.short && answers.cleanBuild) {
        shell.touch(`CLEAN_BUILD_${repo.short}`)
    }
    if (fs.existsSync(repo.name)) {
        let lastPull;
        if (fs.existsSync(`LAST_PULL_${repo.name.toUpperCase()}`)) {
            lastPull = shell.cat(`LAST_PULL_${repo.name.toUpperCase()}`);
        }
        shell.cd(repo.name);
        shell.env['WORKSPACE'] = shell.pwd();
        shell.exec(`git stash`);
        shell.exec(`git checkout ${answers.branch}`);
        shell.exec(`git pull`);
        if (lastPull) {
            console.log(chalk.cyan(''));
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.green(`Changes found`));
            console.log(chalk.cyan('***********************************'));
            shell.exec(`git log --pretty=oneline --since="${lastPull}"`);
            console.log(chalk.cyan('***********************************'));
            console.log(chalk.cyan(''));
        }
        shell.exec(`echo ${new Date().toISOString()} > ../LAST_PULL_${repo.name.toUpperCase()}`);
    } else {
        shell.exec(`git clone ${repo.url}`);
        shell.cd(repo.name);
        shell.env['WORKSPACE'] = shell.pwd();
        shell.exec(`git checkout ${answers.branch}`);
        shell.exec(`echo ${new Date().toISOString()} > ../LAST_PULL_${repo.name.toUpperCase()}`);
    }
    if (repo.short) {
        const yamlFile = `${repo.short.toLowerCase()}.${ODP_RELEASE}-hotfix-${answers.hotfix}.yaml`;
        const yamlPath = path.join(answers.saveLocation, 'yamls', yamlFile);
        shell.rm('-rf', `${yamlPath}`);
        shell.cp(`${repo.short.toLowerCase()}.yaml`, yamlPath);
        shell.sed('-i', '__release_tag__', `'${ODP_RELEASE}'`, yamlPath);
        shell.sed('-i', '__release__', `${ODP_RELEASE}-hotfix-${answers.hotfix}`, yamlPath);
    }
    if (fs.existsSync('scripts/build_image.sh')) {
        shell.exec(`sh scripts/build_image.sh ${ODP_RELEASE} hotfix-${answers.hotfix}`);
        shell.cd(answers.saveLocation);
        if (repo.short) {
            const imageName = `odp:${repo.short.toLowerCase()}.${ODP_RELEASE}-hotfix-${answers.hotfix}`;
            const tarName = `odp_${repo.short.toLowerCase()}.${ODP_RELEASE}-hotfix-${answers.hotfix}.tar`;
            shell.rm('-rf', `${tarName}`);
            shell.rm('-rf', `${tarName}.bz2`);
            shell.exec(`docker save -o ${tarName} ${imageName}`)
                .exec(`bzip2 ${tarName}`);
        }
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