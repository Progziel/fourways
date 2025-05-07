const express = require('express');
const { createReport,deleteReport,validateReport, reportInaccurate } = require('../controllers/reportController');
const {verifyToken} = require('../middlewares/verifyToken');
const upload = require("../middlewares/fileUpload");

const router = express.Router();

router.post('/' ,verifyToken, upload.single('image'), createReport);

router.delete('/:id', deleteReport);

router.post('/validate/:id', validateReport);
router.post('/inaccurate/:id', reportInaccurate);

module.exports = router;