// =================== COMPANY ROUTES ===================
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const ctrl = require('../controllers/companyController');
const followCtrl = require('../controllers/followController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Public - get approved companies
router.get('/', ctrl.getApproved);

// Get pending companies (admin only)
router.get('/pending', authMiddleware, requireRole('admin'), ctrl.getPending);

// Check company status by email (public — for polling on register page)
router.get('/status', ctrl.getStatus);

// Verify company email after registration
router.post('/verify-email', ctrl.verifyCompanyEmail);
router.post('/verify-email/resend', ctrl.resendCompanyVerificationEmail);

// Get single company
router.get('/:id', ctrl.getById);

// ── Follow / Unfollow ──
router.post('/:id/follow',          authMiddleware, followCtrl.follow);
router.delete('/:id/follow',        authMiddleware, followCtrl.unfollow);
router.get('/:id/follow/status',    authMiddleware, followCtrl.status);
router.get('/:id/followers',        followCtrl.getFollowers); // public count

// Update company (owner or admin) - accept files
router.put('/:id', authMiddleware, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'docCommercial', maxCount: 1 },
    { name: 'docTax', maxCount: 1 },
    { name: 'docTourism', maxCount: 1 },
    { name: 'docMinistry', maxCount: 1 },
    { name: 'docOwnerId', maxCount: 1 }
]), ctrl.update);

// Register new company (with document uploads)
router.post('/register', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'docCommercial', maxCount: 1 },
    { name: 'docTax', maxCount: 1 },
    { name: 'docTourism', maxCount: 1 },
    { name: 'docMinistry', maxCount: 1 },
    { name: 'docOwnerId', maxCount: 1 }
]), ctrl.register);

// Approve company (admin only)
router.put('/:id/approve', authMiddleware, requireRole('admin'), ctrl.approve);

// Reject company (admin only)
router.put('/:id/reject', authMiddleware, requireRole('admin'), ctrl.reject);

// Block / unblock company (admin only)
router.put('/:id/block', authMiddleware, requireRole('admin'), ctrl.block);
router.put('/:id/unblock', authMiddleware, requireRole('admin'), ctrl.unblock);

module.exports = router;
