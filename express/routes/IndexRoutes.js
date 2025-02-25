const express = require('express');
const router = express.Router();

const ServiceRoutes = require('./ServiceRoutes');

router.use('/service', ServiceRoutes);

module.exports = router;