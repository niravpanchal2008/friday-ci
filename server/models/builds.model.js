const path = require('path');
const log4js = require('log4js');
const sqlite = require('sqlite3').verbose();

const logger = log4js.getLogger('builds.model');

const db = new sqlite.Database(path.join(global.dbPath, 'cicd.db'));

async function init() {
    const columns = [];
    columns.push(`_id INTEGER PRIMARY KEY AUTOINCREMENT`);
    columns.push(`refId TEXT`);
    columns.push(`repo TEXT NOT NULL`);
    columns.push(`branch TEXT NOT NULL`);
    columns.push(`tag TEXT NOT NULL`);
    columns.push(`clean INTEGER NOT NULL`);
    columns.push(`status TEXT NOT NULL`);
    columns.push(`started INTEGER`);
    columns.push(`ended INTEGER`);
    columns.push(`logs TEXT`);
    db.run(`CREATE TABLE IF NOT EXISTS builds(${columns.join(',')})`, function (err) {
        if (err) {
            logger.error(err);
        } else {
            logger.debug(this);
        }
    });
}

init().catch(err => {
    logger.error(err);
});


/**
 * @typedef BuildModel
 * @property {number} _id
 * @property {string} refId
 * @property {string} repo
 * @property {string} branch
 * @property {string} tag
 * @property {number} clean
 * @property {string} status
 * @property {number} started
 * @property {number} ended
 * @property {string} logs
 */


/**
* 
* @param {string} filter
* @returns {number}
*/
function countDocuments(filter) {
    return new Promise((resolve, reject) => {
        let condition;
        if (filter) {
            condition = 'WHERE ' + filter;
        }
        db.get(`SELECT COUNT(*) AS count FROM builds ${filter}`, function (err, row) {
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                logger.debug(row);
                resolve(row.count);
            }
        });
    });
}

/**
* 
* @param {Object} options
* @param {number} options.count
* @param {number} options.page
* @param {string} options.sort
* @param {string} options.select
* @param {string} options.filter
* @returns {Promise<BuildModel[]>}
*/
function find(options) {
    if (!options) {
        options = {};
    }
    if (!options.count) {
        options.count = 30;
    }
    if (!options.page) {
        options.page = 1;
    }
    let stmt = ['SELECT'];
    if (options.select) {
        stmt.push(`${options.select} FROM builds`);
    } else {
        stmt.push(`* FROM builds`);
    }
    if (options.filter) {
        stmt.push(`WHERE ${options.filter}`);
    }
    if (options.sort) {
        stmt.push(`ORDER BY ${options.sort}`);
    }
    if (options.count && options.count != -1) {
        stmt.push(`LIMIT ${options.count} OFFSET ${(options.page - 1) * options.count}`);
    }
    return new Promise((resolve, reject) => {
        db.all(stmt.join(' '), function (err, rows) {
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                logger.debug(rows);
                resolve(rows);
            }
        });
    });
}

/**
* 
* @param {string} id 
* @returns {Promise<BuildModel>}
*/
function findById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM builds WHERE _id=${id}`, function (err, row) {
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                logger.debug(row);
                resolve(row);
            }
        });
    });
}


/**
 * 
 * @param {BuildModel} payload 
 */
function create(payload) {
    return new Promise((resolve, reject) => {
        const columns = Object.keys(payload);
        const values = Object.values(payload).map(e => {
            if (typeof e === 'string') {
                return "'" + e + "'";
            }
            return e;
        });
        db.run(`INSERT INTO builds(${columns.join(',')}) VALUES(${values.join(',')})`, function (err) {
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                logger.debug(this);
                resolve(this);
            }
        });
    });
}

/**
 * @param {string} id 
 * @param {BuildModel} payload 
 */
function findByIdAndUpdate(id, payload) {
    return new Promise((resolve, reject) => {
        const values = [];
        Object.keys(payload).forEach(key => {
            if (key != '_id') {
                if (typeof payload[key] === 'string') {
                    values.push(`SET ${key}="${payload[key]}"`)
                } else {
                    values.push(`SET ${key}=${payload[key]}`)
                }
            }
        });
        db.run(`UPDATE builds ${values.join(',')} WHERE _id=${id}`, function (err) {
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                logger.debug(this);
                resolve(this);
            }
        });
    });
}

/**
 * @param {string} id 
 */
function findByIdAndRemove(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM builds WHERE _id=${id}`, function (err) {
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                logger.debug(this);
                resolve(this);
            }
        });
    });
}


function removeOldLogs() {
    return new Promise((resolve, reject) => {
        const promises = [];
        db.all(`SELECT _id FROM builds SORT _id SKIP 30`, function (err, rows) {
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                rows.forEach(e => {
                    promises.push(findByIdAndRemove(e._id));
                });
                logger.debug(rows);
                Promise.all(promises).then(resolve).catch(reject);
            }
        });
    });
}


module.exports.countDocuments = countDocuments;
module.exports.find = find;
module.exports.findById = findById;
module.exports.create = create;
module.exports.findByIdAndUpdate = findByIdAndUpdate;
module.exports.findByIdAndRemove = findByIdAndRemove;
module.exports.removeOldLogs = removeOldLogs;