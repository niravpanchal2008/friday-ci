const router = require('express').Router();
const log4js = require('log4js');
const usersModel = require('../models/users.model');

const logger = log4js.getLogger('users.controller');

router.get('/', (req, res) => {
    async function execute() {
        try {
            let filter = {};
            try {
                if (req.query.filter) {
                    filter = JSON.parse(req.query.filter);
                }
            } catch (e) {
                logger.error(e);
                return res.status(400).json({
                    message: e
                });
            }
            if (req.query.countOnly) {
                const count = await usersModel.countDocuments(filter);
                return res.status(200).json(count);
            }
            const docs = await usersModel.find(req.query);
            res.status(200).json(docs);
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
    });
});

router.get('/:id', (req, res) => {
    async function execute() {
        try {
            let doc = await usersModel.findById(req.params.id);
            if (!doc) {
                return res.status(404).json({
                    message: 'Data Model Not Found'
                });
            }
            res.status(200).json(doc);
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

router.post('/', (req, res) => {
    async function execute() {
        try {
            const status = await usersModel.create(req.body);
            res.status(200).json(status);
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

router.put('/:id', (req, res) => {
    async function execute() {
        try {
            const status = await usersModel.findByIdAndUpdate(req.params.id, req.body);;
            res.status(200).json(status);
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

router.delete('/:id', (req, res) => {
    async function execute() {
        try {
            const status = await usersModel.findByIdAndRemove(req.params.id);
            res.status(200).json({
                message: 'Document Deleted'
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

module.exports = router;