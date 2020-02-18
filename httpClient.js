const request = require('request');


function post(url, options) {
    return new Promise((resolve, reject) => {
        request.post(url, {
            json: true,
            headers: {
                'Content-Type': 'application/json'
            },
            body: options.body
        }, (err, res, body) => {
            if (err) {
                reject(err);
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(body);
            } else {
                reject(body);
            }
        });
    });
}

module.exports.post = post;