const router = require('express').Router();

router.use('/auth', require('./auth.controller'));
router.use('/orcli', require('./orcli.controller'));
router.use('/tasks', require('./tasks.controller'));
router.use('/users', require('./users.controller'));
router.use('/builds', require('./builds.controller'));
router.use('/machines', require('./machines.controller'));

module.exports = router;