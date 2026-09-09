// =================== REVIEW ROUTES ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, ctrl.create);
router.put('/:id', authMiddleware, ctrl.update);
router.get('/:type/:id', ctrl.getForTarget);
router.delete('/:id', authMiddleware, ctrl.delete);

module.exports = router;
