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
    const ODP_RELEASE = answers.release;
    shell.exec(`echo ${ODP_RELEASE} > ODP_RELEASE`);
    shell.exec(`echo dev > BRANCH`);
    shell.pwd()
    for (let repo of repoList) {
        console.log(chalk.cyan('***********************************'));
        console.log(chalk.green(`PROCESS STARTED FOR :: ${repo.name}`));
        console.log(chalk.cyan('***********************************'));
        // if (repo.dependency && repo.dependency.length > 0) {
        //     for (let i = 0; i < repo.dependency.length; i++) {
        //         shell.cd(answers.workspace);
        //         const dep = repo.dependency[i];
        //         console.log(chalk.cyan('***********************************'));
        //         console.log(chalk.green(`BUILD STARTED FOR DEPENDENCY :: ${dep}`));
        //         console.log(chalk.cyan('***********************************'));
        //         const tempRepo = repoList.find(e => e.name === dep);
        //         buildImage(tempRepo, answers);
        //         console.log(chalk.cyan('***********************************'));
        //         console.log(chalk.green(`BUILD ENDED FOR DEPENDENCY :: ${dep}`));
        //         console.log(chalk.cyan('***********************************'));
        //     }
        // }
        shell.cd(answers.workspace);
        buildImage(repo, answers);
        console.log(chalk.cyan('***********************************'));
        console.log(chalk.green(`PROCESS ENDED FOR :: ${repo.name}`));
        console.log(chalk.cyan('***********************************'));
    }
    saveOtherImages(answers);
}

/**
 * 
 * @param {{name:string,url:string,node:boolean,short:string,dependency:string[]}} repo 
 * @param {*} answers 
 */
function buildImage(repo, answers) {
    const ODP_RELEASE = answers.release;
    if (repo.short && repo.short !== 'B2B') {
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
        shell.exec(`git checkout dev`);
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
        shell.exec(`git checkout dev`);
        shell.exec(`echo ${new Date().toISOString()} > ../LAST_PULL_${repo.name.toUpperCase()}`);
    }
    if (fs.existsSync('scripts/build_image.sh')) {
        shell.exec(`sh scripts/build_image.sh ${ODP_RELEASE}`);
        shell.cd(answers.saveLocation);
        const imageName = `odp:${repo.short.toLowerCase()}.${ODP_RELEASE}`;
        const tarName = `odp_${repo.short.toLowerCase()}.${ODP_RELEASE}.tar`;
        if (fs.existsSync(`${tarName}`)) {
            shell.rm('-rf', `${tarName}`);
        }
        if (fs.existsSync(`${tarName}.bz2`)) {
            shell.rm('-rf', `${tarName}.bz2`);
        }
        shell.exec(`docker save -o ${tarName} ${imageName}`)
            .exec(`bzip2 odp_${repo.short.toLowerCase()}.${ODP_RELEASE}.tar`);
        if (repo.short === 'SM') {
            shell.exec(`docker save -o odp_base.${ODP_RELEASE}.tar odp:base.${ODP_RELEASE}`)
                .exec(`bzip2 odp_base.${ODP_RELEASE}.tar`);
            shell.exec(`docker save -o node.10-alpine.tar node:10-alpine`)
                .exec(`bzip2 node.10-alpine.tar`);
        }
        if (repo.short === 'B2B') {
            shell.exec(`docker save -o odp_b2b.runner.${ODP_RELEASE}.tar odp:b2b.runner.${ODP_RELEASE}`)
                .exec(`bzip2 odp_b2b.runner.${ODP_RELEASE}.tar`);
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

/**
 * 
 * @param {*} answers 
 */
function saveOtherImages(answers) {
    const ODP_RELEASE = answers.release;
    shell.cd(answers.workspace);

    console.log(chalk.cyan('***********************************'));
    console.log(chalk.green(`SAVING IMAGE :: alpine`));
    console.log(chalk.cyan('***********************************'));
    shell.cd(answers.saveLocation);
    if (fs.existsSync('alpine.3.8.tar.bz2')) {
        shell.rm('-rf', 'alpine.3.8.tar.bz2');
    }
    shell.exec(`docker save -o alpine.3.8.tar alpine.3.8`)
        .exec(`bzip2 alpine.3.8.tar`);
    console.log(chalk.cyan('***********************************'));
    console.log(chalk.green(`IMAGE SAVED :: alpine`));
    console.log(chalk.cyan('***********************************'));

    console.log(chalk.cyan('***********************************'));
    console.log(chalk.green(`SAVING IMAGE :: redis`));
    console.log(chalk.cyan('***********************************'));
    shell.cd(answers.saveLocation);
    if (fs.existsSync('redis.tar.bz2')) {
        shell.rm('-rf', 'redis.tar.bz2');
    }
    shell.exec(`docker save -o redis.tar redis:5-alpine`)
        .exec(`bzip2 redis.tar`);
    console.log(chalk.cyan('***********************************'));
    console.log(chalk.green(`IMAGE SAVED :: redis`));
    console.log(chalk.cyan('***********************************'));

    console.log(chalk.cyan('***********************************'));
    console.log(chalk.green(`SAVING IMAGE :: nats`));
    console.log(chalk.cyan('***********************************'));
    shell.cd(answers.saveLocation);
    if (fs.existsSync('nats-streaming.tar.bz2')) {
        shell.rm('-rf', 'nats-streaming.tar.bz2');
    }
    shell.exec(`docker save -o nats-streaming.tar nats-streaming`)
        .exec(`bzip2 nats-streaming.tar`);
    console.log(chalk.cyan('***********************************'));
    console.log(chalk.green(`IMAGE SAVED :: nats`));
    console.log(chalk.cyan('***********************************'));

    shell.cd(answers.workspace);
    if (fs.existsSync('integration-edge-gateway')) {
        shell.rm('-rf', 'integration-edge-gateway');
    }
    shell.mkdir('integration-edge-gateway');
    shell.cp('odp-b2b-agent/exec/*', 'integration-edge-gateway/.');
    shell.cp('odp-b2b-agent/edge-confs/*', 'integration-edge-gateway/.');
    shell.exec(`tar -cvf integration-edge-gateway.${ODP_RELEASE}.tar integration-edge-gateway`)
        .exec(`bzip2 integration-edge-gateway.${ODP_RELEASE}.tar`);
    shell.mv(`integration-edge-gateway.${ODP_RELEASE}.tar.bz2`, `${answers.saveLocation}`)

    shell.cd(answers.workspace);
    shell.cp('odp-releasebuild/supportedServiceYamls/*', 'yamlFiles/.');
    shell.cp('odp-releasebuild/yamls/configMap.yaml', 'yamlFiles/.');
    shell.cp('odp-releasebuild/yamls/servicerole-odp-admin.yaml', 'yamlFiles/.');
    shell.cd('yamlFiles');
    shell.rm('*.bak');
    shell.cd(answers.workspace);
    if (fs.existsSync('yamlFiles.zip')) {
        shell.rm('-rf', 'yamlFiles.zip');
    }
    shell.exec(`zip -r yamlFiles.zip yamlFiles/*`);
    shell.mv(`yamlFiles.zip`, `${answers.saveLocation}`);
}

module.exports.trigger = trigger;