var express = require('express');
var router = express.Router();
const ServiceController = require('../controllers/ServiceController');

router.post("/start", ServiceController.serviceStart);
router.post("/stop", ServiceController.serviceStop);
// router.get("/configuration", ServiceController.getBrand);
// router.get("/upload-firmware", ServiceController.getBrand);
// router.get("/chargers", ServiceController.getBrand);
// router.get("/test", ServiceController.getBrand);

module.exports = router;