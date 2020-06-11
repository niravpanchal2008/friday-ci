const path = require('path');
const log4js = require('log4js');
const sqlite = require('sqlite3').verbose();

const logger = log4js.getLogger('users.model');

const db = new sqlite.Database(path.join(global.dbPath, 'cicd.db'));

async function init() {
    const columns = [];
    columns.push(`username TEXT PRIMARY KEY`);
    columns.push(`password TEXT NOT NULL`);
    columns.push(`type TEXT NOT NULL`);
    db.run(`CREATE TABLE IF NOT EXISTS users(${columns.join(',')})`, function (err1) {
        if (err1) {
            logger.error(err1);
        } else {
            logger.debug(this);
        }
        db.get(`SELECT * FROM users WHERE username='admin'`, function (err2, row) {
            if (err2) {
                logger.error(err2);
            } else if (!row) {
                logger.info('Default user not found. Creating User.');
                db.run(`INSERT INTO users VALUES('admin','123123123','ADMIN')`, function (err3) {
                    if (err2) {
                        logger.error(err2);
                    } else {
                        logger.info('Default user created.');
                    }
                });
            }
        });
    });

}

init().catch(err => {
    logger.error(err);
});


/**
 * @typedef UserModel
 * @property {string} username
 * @property {string} password
 * @property {string} branch
 * @property {string} type
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
        db.get(`SELECT COUNT(*) AS count FROM users ${filter}`, function (err, row) {
            if (err) {
                logger.error(err);
                reject(err);
            } else {
                logger.debug('countDocuments', row);
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
* @returns {UserModel[]}
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
        stmt.push(`${options.select} FROM users`);
    } else {
        stmt.push(`* FROM users`);
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
                logger.error('find', err);
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
* @returns {UserModel}
*/
function findById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE username='${id}'`, function (err, row) {
            if (err) {
                logger.error('findById', err);
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
 * @param {UserModel} payload 
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
        db.run(`INSERT INTO users(${columns.join(',')}) VALUES(${values.join(',')})`, function (err) {
            if (err) {
                logger.error('create', err);
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
 * @param {UserModel} payload 
 */
function findByIdAndUpdate(id, payload) {
    return new Promise((resolve, reject) => {
        const values = [];
        Object.keys(payload).forEach(key => {
            if (key != 'username') {
                if (typeof payload[key] === 'string') {
                    values.push(`SET ${key}="${payload[key]}"`)
                } else {
                    values.push(`SET ${key}=${payload[key]}`)
                }
            }
        });
        db.run(`UPDATE users ${values.join(',')} WHERE username='${id}'`, function (err) {
            if (err) {
                logger.error('findByIdAndUpdate', err);
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
        db.run(`DELETE FROM users WHERE username='${id}'`, function (err) {
            if (err) {
                logger.error('findByIdAndRemove', err);
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