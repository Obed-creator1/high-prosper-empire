// backend/routes/uploadExcel.js
const express = require('express');
const multer = require('multer');
const { readExcel } = require('../utils/excel/readExcel');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const data = await readExcel(req.file.path);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
