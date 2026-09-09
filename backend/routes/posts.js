const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/postsController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.getAll);
router.get('/drafts/my', authMiddleware, ctrl.getDrafts);
router.get('/:id', authMiddleware, ctrl.getById);
router.post('/', authMiddleware, ctrl.create);
router.post('/draft', authMiddleware, ctrl.createDraft);
router.post('/share', authMiddleware, ctrl.share);
router.post('/:id/publish', authMiddleware, ctrl.publishDraft);
router.put('/:id', authMiddleware, ctrl.update);
router.delete('/:id', authMiddleware, ctrl.remove);
router.post('/:id/comments', authMiddleware, requireRole('company', 'admin'), ctrl.addComment);
router.post('/:id/offers', authMiddleware, requireRole('company'), ctrl.addOffer);
router.post('/:id/offers/:offerId/accept', authMiddleware, ctrl.acceptOffer);
router.post('/:id/offers/:offerId/reject', authMiddleware, ctrl.rejectOffer);

// Company Proposals
router.post('/:id/proposals', authMiddleware, requireRole('company'), ctrl.addProposal);
router.put('/:id/proposals/:proposalId', authMiddleware, requireRole('company'), ctrl.updateProposal);
router.delete('/:id/proposals/:proposalId', authMiddleware, ctrl.deleteProposal);
router.post('/:id/proposals/:proposalId/approve', authMiddleware, ctrl.approveProposal);
// Close post after payment
router.post('/:id/close', authMiddleware, ctrl.closePost);

module.exports = router;
