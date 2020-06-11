const { exec } = require('child_process');
const { execSync } = require('child_process');
const { Observable } = require('rxjs');

/**
 * 
 * @param {string} command 
 */
function execute(command) {
    return new Observable((observe) => {
        const child = exec(command);
        child.on('error', function (err) {
            console.log('*********** BUILD FAILED ***********');
            observe.error(err);
        });
        child.on('close', function () {
            observe.next(null);
            observe.complete();
        });
        child.stdout.on('data', function (chunk) {
            observe.next(chunk);
        });
        child.stdout.on('error', function (err) {
            console.log('*********** BUILD FAILED ***********');
            observe.error(err);
        });
        child.stderr.on('data', function (chunk) {
            observe.next(chunk);
        });
        child.stderr.on('error', function (err) {
            console.log('*********** BUILD FAILED ***********');
            observe.error(err);
        });
    });
}

/**
 * 
 * @param {string} command 
 */
function executeSync(command) {
    return execSync(command);
}

module.exports.execute = execute;
module.exports.executeSync = executeSync;