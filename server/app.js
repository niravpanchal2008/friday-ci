const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const tls = require('tls');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const log4js = require('log4js');
const socket = require('socket.io');
const NodeSchedule = require('node-schedule');

const PORT = process.env.PORT || 3001;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const logger = log4js.getLogger('server');
const app = express();
const server = http.createServer(app);
const io = socket(server, { path: '/socket' });

global.socket = io;
global.dbPath = path.join(__dirname, 'db');
global.secret = 'itworks@123123123';
global.cookieName = 'orcli-session';

if (!fs.existsSync(global.dbPath)) {
    fs.mkdirSync(global.dbPath);
}

const buildsModel = require('./models/builds.model');

log4js.configure({
    appenders: { 'out': { type: 'stdout' }, server: { type: 'multiFile', base: 'logs/', property: 'categoryName', extension: '.log', maxLogSize: 10485760, backups: 3, compress: true } },
    categories: { default: { appenders: ['out', 'server'], level: LOG_LEVEL } }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(cookieParser());

app.use((req, res, next) => {
    logger.info(req.method, req.headers['x-forwarded-for'] || req.connection.remoteAddress, req.path);
    next();
});

app.use((req, res, next) => {
    let token = req.headers.authorization;
    if (!token) {
        token = req.cookies[global.cookieName];
    }
    if (req.path.indexOf('/auth') > -1) {
        next();
    } else if (token && token === 'ORCLI') {
        next();
    } else {
        res.status(401).json({
            message: 'Unauthorised'
        });
    }
});

app.use('/api', require('./controllers'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


server.listen(PORT, (err) => {
    if (!err) {
        logger.info('Server is listening on port', PORT);
    } else {
        logger.error(err);
    }
});

// const client = tls.connect({
//     port: 8000,
//     // ca: [fs.readFileSync('../build-client/keys/ca.crt')],
//     key: fs.readFileSync('../build-client/keys/client.key'),
//     cert: fs.readFileSync('../build-client/keys/client.crt'),
//     rejectUnauthorized: false
// });

// client.on('secureConnect', function () {
//     logger.info('Connected to service');
// });

// client.on('data', function (data) {
//     logger.info('Data from Service', data.toString());
// });


// io.on('connection', function (socket) {
//     logger.info('Socket Client Connected.', socket.id);
// });


NodeSchedule.scheduleJob('cleanLogs', '1 */2 * * *', function (fireDate) {
    logger.info('CRON Jon : ' + fireDate + ' : Cleaning Old Builds');
    buildsModel.removeOldLogs().then(res => {
        logger.info('Old Builds Removed');
    }).catch(err => {
        logger.error('Old Builds Removed Error', err);
    });
});