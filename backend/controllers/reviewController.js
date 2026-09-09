// =================== REVIEW CONTROLLER ===================
const Review  = require('../models/Review');
const Company = require('../models/Company');

// Helper: recalculate and update company rating + reviews count
async function updateCompanyStats(targetId) {
    try {
        const reviews = await Review.find({ targetType: 'company', targetId });
        const count   = reviews.length;
        const avg     = count ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count : 0;
        await Company.findByIdAndUpdate(targetId, {
            reviews: count,
            rating:  Math.round(avg * 10) / 10
        });
    } catch (_) {}
}

// Create review
exports.create = async (req, res) => {
    try {
        // Map targetType to targetModel
        const modelMap = {
            'attraction': 'Attraction',
            'company': 'Company',
            'hotel': 'Hotel'
        };

        const targetModel = modelMap[req.body.targetType];
        if (!targetModel) {
            return res.status(400).json({ message: 'Invalid target type' });
        }

        // Prevent company from reviewing itself
        if (req.body.targetType === 'company' && req.user.role === 'company') {
            const ownCompany = await Company.findOne({ userId: req.user.id }).select('_id').catch(() => null);
            if (ownCompany && String(ownCompany._id) === String(req.body.targetId)) {
                return res.status(403).json({ message: 'You cannot review your own company' });
            }
        }

        const review = await Review.create({
            ...req.body,
            targetModel,
            userId: req.user.id
        });

        // Update company reviews count + rating
        if (req.body.targetType === 'company' && req.body.targetId) {
            await updateCompanyStats(req.body.targetId);
        }

        res.status(201).json({ message: 'Review added', review });
    } catch (err) {
        console.error('Review create error:', err);
        res.status(500).json({ message: 'Review submission failed', error: err.message });
    }
};

// Get reviews for target
exports.getForTarget = async (req, res) => {
    try {
        const reviews = await Review.find({
            targetType: req.params.type,
            targetId: req.params.id
        }).populate('userId', 'fullName').sort('-createdAt');
        res.json({ reviews });
    } catch (err) {
        res.json({ reviews: [] });
    }
};

// Update review
exports.update = async (req, res) => {
    try {
        const review = await Review.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { rating: req.body.rating, comment: req.body.comment },
            { new: true }
        );
        if (!review) return res.status(404).json({ message: 'Review not found' });

        // Recalculate company stats if needed
        if (review.targetType === 'company') {
            await updateCompanyStats(review.targetId);
        }

        res.json({ message: 'Review updated', review });
    } catch (err) {
        res.status(500).json({ message: 'Update failed' });
    }
};

// Delete review
exports.delete = async (req, res) => {
    try {
        const filter = req.user?.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, userId: req.user.id };
        const review = await Review.findOneAndDelete(filter);

        // Recalculate company stats after deletion
        if (review && review.targetType === 'company') {
            await updateCompanyStats(review.targetId);
        }

        res.json({ message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
    }
};

// Get all reviews (admin)
exports.getAll = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('userId', 'fullName email')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ reviews });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
