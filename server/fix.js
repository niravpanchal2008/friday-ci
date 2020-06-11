const path = require('path');

global.dbPath = path.join(process.cwd(), 'db');

const buildsModel = require('./models/builds.model');


const arr = [];
buildsModel.find({
    select: '_id, status',
    filter: 'status="Processing"',
    count: -1
}).then(docs => {
    docs.forEach(doc => {
        console.log(doc);
        arr.push(buildsModel.findByIdAndUpdate(doc._id, { status: 'Success' }));
    });
}).catch(err => {
    console.error(err);
});

Promise.all(arr).then(allStatus => {
    console.log(allStatus);
}).catch(err => {
    console.error(err);
})