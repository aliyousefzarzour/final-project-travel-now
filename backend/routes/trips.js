const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/collectionController');
const { authMiddleware } = require('../middleware/auth');

router.get('/my', authMiddleware, ctrl.getTrips);
router.post('/', authMiddleware, ctrl.createTrip);
router.put('/:id', authMiddleware, ctrl.updateTrip);
router.delete('/:id', authMiddleware, ctrl.deleteTrip);

module.exports = router;
