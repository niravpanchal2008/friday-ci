const path = require('path');
const log4js = require('log4js');
const sqlite = require('sqlite3').verbose();

const logger = log4js.getLogger('machines.model');

const db = new sqlite.Database(path.join(global.dbPath, 'cicd.db'));

async function init() {
    const columns = [];
    columns.push(`_id INTEGER PRIMARY KEY AUTOINCREMENT`);
    columns.push(`name TEXT NOT NULL`);
    columns.push(`ip TEXT NOT NULL`);
    columns.push(`port TEXT NOT NULL`);
    db.run(`CREATE TABLE IF NOT EXISTS machines(${columns.join(',')})`, function (err) {
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
 * @typedef TaskModel
 * @property {number} _id
 * @property {string} name
 * @property {string} ip
 * @property {string} port
 */


/**
* 
* @param {string} filter
* @returns {Promise<number>}
*/
function countDocuments(filter) {
    return new Promise((resolve, reject) => {
        let condition;
        if (filter) {
            condition = 'WHERE ' + filter;
        }
        db.get(`SELECT COUNT(*) AS count FROM machines ${filter}`, function (err, row) {
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
* @returns {Promise<TaskModel[]>}
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
        stmt.push(`${options.select} FROM machines`);
    } else {
        stmt.push(`* FROM machines`);
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
* @returns {Promise<TaskModel>}
*/
function findById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM machines WHERE _id=${id}`, function (err, row) {
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
 * @param {TaskModel} payload 
 */
function create(payload) {
    return new Promise((resolve, reject) => {
        const columns = [];
        const values = [];
        Object.keys(payload).map(e => {
            if (payload[e] != null && payload[e] != undefined) {
                columns.push(e);
                if (typeof e === 'string') {
                    values.push("'" + payload[e] + "'");
                } else {
                    values.push(payload[e]);
                }
            }
        });
        console.log(`INSERT INTO machines(${columns.join(',')}) VALUES(${values.join(',')})`);

        db.run(`INSERT INTO machines(${columns.join(',')}) VALUES(${values.join(',')})`, function (err) {
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
 * @param {TaskModel} payload 
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
        db.run(`UPDATE machines ${values.join(',')} WHERE _id=${id}`, function (err) {
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
        db.run(`DELETE FROM machines WHERE _id=${id}`, function (err) {
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


module.exports.countDocuments = countDocuments;
module.exports.find = find;
module.exports.findById = findById;
module.exports.create = create;
module.exports.findByIdAndUpdate = findByIdAndUpdate;
module.exports.findByIdAndRemove = findByIdAndRemove;