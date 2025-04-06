const express = require('express');
const router = express.Router();
const crimeController = require('../controllers/crimeController');
const upload = require('../../multerConfig');

router.post('/', upload.single('file'), crimeController.processCrimeReport);
router.get('/', crimeController.getCrimeReports);
router.get('/:id', crimeController.getCrimeReportById);

module.exports = router;