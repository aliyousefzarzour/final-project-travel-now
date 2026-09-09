const Offer   = require('../models/Offer');
const Company = require('../models/Company');
const Follow  = require('../models/Follow');
const User    = require('../models/User');

exports.getAll = async (req, res) => {
    try {
        const offers = await Offer.find({ isActive: true })
            .populate('companyId', 'companyName email governorate verified ministry rating reviews userId')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ offers });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate('companyId', 'companyName email governorate verified ministry rating reviews userId')
            .catch(() => null);
        if (!offer) return res.status(404).json({ message: 'Offer not found' });
        res.json({ offer });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.user.id }).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company profile not found' });
        const offer = await Offer.create({
            companyId: company._id,
            title: req.body.title,
            type: req.body.type,
            destination: req.body.destination,
            description: req.body.description,
            price: req.body.price,
            duration: req.body.duration,
            availableSeats: req.body.availableSeats,
            bookingDeadline: req.body.bookingDeadline,
            images: req.body.images || []
        });

        // Notify followers via WhatsApp (non-fatal, background)
        setImmediate(async () => {
            try {
                const wa      = require('../services/whatsappService');
                const follows = await Follow.find({ companyId: company._id })
                    .populate('userId', 'phone fullName').catch(() => []);
                const phones  = follows.map(f => f.userId?.phone).filter(Boolean);
                if (phones.length) {
                    const profileLink = `http://localhost:5500/pages/company-profile.html?id=${company._id}`;
                    await wa.sendPromotionToFollowers(
                        phones,
                        company.companyName,
                        offer.title,
                        offer.price,
                        profileLink,
                        company._id   // pass companyId as offerId for deep-link
                    );
                }
            } catch (_) {}
        });

        res.status(201).json({ message: 'Offer created', offer });
    } catch (err) {
        res.status(500).json({ message: 'Creation failed', error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.user.id }).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company profile not found' });
        const offer = await Offer.findOneAndUpdate(
            { _id: req.params.id, companyId: company._id },
            req.body,
            { new: true }
        ).catch(() => null);
        if (!offer) return res.status(404).json({ message: 'Offer not found' });
        res.json({ message: 'Offer updated', offer });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.user.id }).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company profile not found' });
        const offer = await Offer.findOneAndDelete({ _id: req.params.id, companyId: company._id }).catch(() => null);
        if (!offer) return res.status(404).json({ message: 'Offer not found' });
        res.json({ message: 'Offer deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed', error: err.message });
    }
};
