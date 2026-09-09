// =================== FOLLOW ROUTES ===================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/followController');
const { authMiddleware } = require('../middleware/auth');

// My followed companies
router.get('/my', authMiddleware, ctrl.myFollows);

module.exports = router;
