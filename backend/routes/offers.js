const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/offerController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authMiddleware, requireRole('company'), ctrl.create);
router.put('/:id', authMiddleware, requireRole('company'), ctrl.update);
router.delete('/:id', authMiddleware, requireRole('company'), ctrl.remove);

module.exports = router;
