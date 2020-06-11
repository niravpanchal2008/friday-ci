const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const express = require('express');
const log4js = require('log4js');
const multer = require('multer');
const speakeasy = require('speakeasy');

const PORT = process.env.PORT || 8000;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const SECRET = process.env.SECRET || 'appveen@2018';
const IMAGES_PATH = path.join(os.homedir(), 'ORCLI-IMAGES');

try {
    fs.mkdirSync(IMAGES_PATH);
} catch (e) {

}

const logger = log4js.getLogger('server');
const app = express();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, IMAGES_PATH);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

let logFile = path.join('./logs/');
if (process.env.NODE_ENV === 'production') {
    logFile = path.join('/var/log/orcli-client/');
}

log4js.configure({
    appenders: { 'out': { type: 'stdout' }, server: { type: 'multiFile', base: logFile, property: 'categoryName', extension: '.log', maxLogSize: 10485760, backups: 3, compress: true } },
    categories: { default: { appenders: ['out', 'server'], level: LOG_LEVEL } }
});

app.use((req, res, next) => {
    const token = req.get('totp');
    const flag = speakeasy.totp.verify({
        secret: SECRET,
        window: 1,
        token: token
    });
    if (flag) {
        next();
    } else {
        res.status(401).json({
            messsage: 'Unauthorised'
        });
    }
    // next();
});

app.use(express.json({
    inflate: true
}));

app.use(upload.any());

app.use((req, res, next) => {
    logger.info(req.method, req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.path);
    next();
});

app.get('/', (req, res) => {
    res.json({ messsage: 'ORCLI Client is running on: ' + PORT });
});

app.post('/deploy', (req, res) => {
    const module = req.body.module;
    const tag = req.body.tag;
    const namespace = req.body.namespace;
    if (!module || !tag || !namespace) {
        return res.status(400).json({
            messsage: 'Required fields are not send'
        });
    }
    const setImageCmd = `kubectl set image deployment/${module} ${module}=odp:${module}.${tag} -n ${namespace} --record=true`;
    logger.info('RUNNING COMMAND:', setImageCmd);
    exec(`docker load < ${req.file.originalname} && ${setImageCmd}`, {
        cwd: IMAGES_PATH
    }, function (err, stdout, stderr) {
        if (err) {
            logger.error(err);
            res.status(500).json(err);
        } else if (stderr) {
            logger.warn(stderr);
            res.status(400).json(stderr);
        } else {
            logger.info(stdout);
            res.status(200).json(stdout);
        }
    });
});

const server = app.listen(PORT, (err) => {
    if (!err) {
        logger.info('Server is listening on port', PORT);
    } else {
        logger.error(err);
    }
});

const timeout = 1000 * 60 * 60;
server.setTimeout(timeout);
