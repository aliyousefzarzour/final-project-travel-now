// =================== ATTRACTION ROUTES ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attractionController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authMiddleware, requireRole('admin'), ctrl.create);
router.put('/:id', authMiddleware, requireRole('admin'), ctrl.update);
router.delete('/:id', authMiddleware, requireRole('admin'), ctrl.delete);

module.exports = router;
