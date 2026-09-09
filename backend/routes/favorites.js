const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/collectionController');
const { authMiddleware } = require('../middleware/auth');

router.get('/check/:attractionId', authMiddleware, ctrl.checkFavorite);
router.get('/', authMiddleware, ctrl.getFavorites);
router.post('/', authMiddleware, ctrl.addFavorite);
router.delete('/by-attraction/:attractionId', authMiddleware, ctrl.removeFavoriteByAttraction);
router.delete('/:id', authMiddleware, ctrl.removeFavorite);

module.exports = router;
