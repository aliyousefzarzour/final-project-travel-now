// =================== TRIP PLANNER ROUTES ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tripPlannerController');
const { authMiddleware } = require('../middleware/auth');

router.post('/generate', authMiddleware, ctrl.generate);
router.get('/my', authMiddleware, ctrl.getMyTrips);
router.get('/:id', authMiddleware, ctrl.getById);

module.exports = router;
