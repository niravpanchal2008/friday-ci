const os = require('os');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const dateformat = require('dateformat');
const router = require('express').Router();
const log4js = require('log4js');
const jsonfile = require('jsonfile');
const speakeasy = require('speakeasy');
const async = require('async');
const Convert = require('ansi-to-html');

const buildsModel = require('../models/builds.model');
const prepareScript = require('../utils/prepare-script');
const shell = require('../utils/shell');

const convert = new Convert();
const pushLogs = async.priorityQueue(pushLogsHandler);
const socket = global.socket;
const secret = global.secret;

/**
 * @type {[{name:string,url:string,node:boolean,short:string,dependency:string[]}]}
 */
const repoList = jsonfile.readFileSync(path.join(process.cwd(), 'repo-list.json'));

const logger = log4js.getLogger('orcli.controller');


router.get('/hotfix', (req, res) => {
    async function execute() {
        try {
            res.status(200).json(repoList);
        } catch (e) {
            if (typeof e === 'string') {
                throw new Error(e);
            }
            throw e;
        }
    }
    execute().catch(err => {
        logger.error(err);
        res.status(500).json({
            message: err.message
        });
    })
});

router.post('/hotfix', (req, res) => {
    async function execute() {
        try {
            const payload = req.body;
            if (!payload.workspace) {
                payload.workspace = path.join(os.homedir(), 'orcli_workspace');
            }
            payload.workspace = path.join(process.cwd(), path.relative(process.cwd(), payload.workspace));
            if (payload.releaseType == 'New Release') {
                payload.workspace = path.join(payload.workspace, payload.release);
            } else {
                payload.workspace = path.join(payload.workspace, payload.branch);
            }
            if (payload.upload) {
                if (!payload.code) {
                    return res.status(400).json({
                        message: 'Code required to upload into E-Delivery'
                    });
                }
                if (!speakeasy.totp.verify({
                    secret: secret,
                    token: payload.code,
                    window: 1
                })) {
                    return res.status(400).json({
                        message: 'Invalid Code'
                    });
                }
            }
            const date = new Date();
            payload.saveLocation = path.join(payload.workspace, 'images', dateformat(date, 'yyyy_mm_dd'));
            const script = prepareScript.hotfixScript(payload);
            const filepath = path.join(os.tmpdir(), Date.now().toString());
            logger.info(os.tmpdir(), filepath);
            fs.writeFileSync(filepath, script, {
                encoding: 'utf-8'
            });
            shell.executeSync('chmod +x ' + filepath);
            const repo = repoList.find(e => e.name === payload.repo);
            const buildData = {};
            buildData.repo = payload.repo;
            buildData.branch = payload.branch;
            buildData.clean = payload.cleanBuild;
            if (repo.short) {
                buildData.tag = 'odp:' + repo.short.toLowerCase() + '.' + payload.branch + '-hotfix-' + payload.hotfix;
            }
            buildData.status = 'Processing';
            buildData.started = Date.now();
            buildsModel.create(buildData).then(status => {
                logger.info('Build Logged', status.lastID);
                const lastID = status.lastID;
                shell.execute('sh ' + filepath).subscribe(async (data) => {
                    if (data) {
                        const htmlData = convert.toHtml(data);
                        socket.emit('logs', {
                            _id: lastID,
                            logs: htmlData
                        });
                        const newData = {};
                        const bd = await buildsModel.findById(lastID);
                        newData.logs = unescape((bd.logs || '')) + data;
                        newData.logs = escape(newData.logs);
                        pushLogs.push({
                            _id: lastID,
                            data: { logs: newData.logs }
                        });
                        // const status = await buildsModel.findByIdAndUpdate(lastID, newData);
                    } else {
                        const newData = {
                            status: 'Success'
                        };
                        socket.emit('buildStatus', {
                            _id: lastID,
                            status: 'Success'
                        });
                        pushLogs.push({
                            _id: lastID,
                            data: {
                                status: 'Success'
                            }
                        });
                        // const status = await buildsModel.findByIdAndUpdate(lastID, newData);
                    }
                }, async (err) => {
                    console.log('Build Failed', err);
                    const newData = {
                        status: 'Failed'
                    };
                    pushLogs.push({
                        _id: lastID,
                        data: { status: 'Failed' }
                    });
                    // const status = await buildsModel.findByIdAndUpdate(lastID, newData);
                });
            }).catch(err => {
                logger.error(err);
            });
            res.status(200).json({
                message: 'Build Started'
            });
        } catch (e) {
            if (typeof e === 'string') {
                throw new Error(e);
            }
            throw e;
        }
    }
    execute().catch(err => {
        logger.error(err);
        res.status(500).json({
            message: err.message
        });
    })
});


async function pushLogsHandler(obj, callback) {
    const _id = obj._id;
    const data = obj.data;
    try {
        const status = await buildsModel.findByIdAndUpdate(_id, data);
    } catch (e) {
        logger.error('pushLogsHandler', e);
    }
    callback();
}

module.exports = router;