const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const importController = require('../controllers/importController');

router.use(protect);

router.post('/', importController.createImport);
router.get('/', importController.listImports);
router.get('/:id', importController.getImport);
router.put('/:id', importController.updateImport);
router.delete('/:id', importController.deleteImport);

module.exports = router;
