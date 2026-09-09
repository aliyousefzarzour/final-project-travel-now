// =================== FOLLOW CONTROLLER ===================
const Follow  = require('../models/Follow');
const Company = require('../models/Company');

/**
 * POST /api/companies/:id/follow
 * Tourist follows a company.
 */
exports.follow = async (req, res) => {
    try {
        const companyId = req.params.id;
        const company = await Company.findById(companyId).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        // Prevent company from following itself
        if (String(company.userId) === String(req.user.id)) {
            return res.status(403).json({ message: 'You cannot follow your own company' });
        }

        await Follow.create({ userId: req.user.id, companyId });
        res.status(201).json({ message: 'Following company', following: true });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Already following this company' });
        }
        res.status(500).json({ message: 'Follow failed', error: err.message });
    }
};

/**
 * DELETE /api/companies/:id/follow
 * Tourist unfollows a company.
 */
exports.unfollow = async (req, res) => {
    try {
        const result = await Follow.findOneAndDelete({
            userId: req.user.id,
            companyId: req.params.id
        });
        if (!result) return res.status(404).json({ message: 'Follow relationship not found' });
        res.json({ message: 'Unfollowed company', following: false });
    } catch (err) {
        res.status(500).json({ message: 'Unfollow failed', error: err.message });
    }
};

/**
 * GET /api/companies/:id/follow/status
 * Returns whether the current user follows this company.
 */
exports.status = async (req, res) => {
    try {
        const follow = await Follow.findOne({
            userId: req.user.id,
            companyId: req.params.id
        }).catch(() => null);
        const count = await Follow.countDocuments({ companyId: req.params.id }).catch(() => 0);
        res.json({ following: !!follow, followersCount: count });
    } catch (err) {
        res.status(500).json({ message: 'Status check failed', error: err.message });
    }
};

/**
 * GET /api/companies/:id/followers
 * Returns follower count for a company (public).
 */
exports.getFollowers = async (req, res) => {
    try {
        const count = await Follow.countDocuments({ companyId: req.params.id }).catch(() => 0);
        res.json({ followersCount: count });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/**
 * GET /api/follows/my
 * Returns all companies the current user follows.
 */
exports.myFollows = async (req, res) => {
    try {
        const follows = await Follow.find({ userId: req.user.id })
            .populate('companyId', 'companyName governorate logo verified rating')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ follows: follows.map(f => f.companyId).filter(Boolean) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
