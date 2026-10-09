// =================== BOOKING CONTROLLER ===================
const Booking = require('../models/Booking');
const mongoose = require('mongoose');
const Company = require('../models/Company');
const Offer = require('../models/Offer');
const Attraction = require('../models/Attraction');
const Post = require('../models/Post');
const User = require('../models/User');
const { calculatePayableAmount } = require('../services/bookingPricing');
const { send: sendNotification } = require('./notificationController');

function getContactInfo(value = {}) {
    return {
        name: String(value.name || '').trim().slice(0, 100),
        email: String(value.email || '').trim().slice(0, 254),
        phone: String(value.phone || '').trim().slice(0, 30)
    };
}

// Create booking
exports.create = async (req, res) => {
    try {
        if (!req.body.type || !['offer', 'attraction', 'proposal'].includes(req.body.type)) {
            return res.status(400).json({ message: 'Booking type is required' });
        }
        if (['amount', 'currency', 'status', 'paymentId', 'companyId', 'title'].some(field => field in req.body)) {
            return res.status(400).json({ message: 'Booking price, status, title, and payment fields are server-managed' });
        }
        const travelers = Number(req.body.travelers ?? 1);
        if (!Number.isInteger(travelers) || travelers < 1 || travelers > 50) {
            return res.status(400).json({ message: 'Travelers must be a whole number between 1 and 50' });
        }

        let travelDate = req.body.travelDate ? new Date(req.body.travelDate) : null;
        if (travelDate && Number.isNaN(travelDate.getTime())) {
            return res.status(400).json({ message: 'Invalid travel date' });
        }

        const duplicateFilter = {
            userId: req.user.id,
            type: req.body.type,
            travelDate: travelDate
        };
        let title;
        let companyId = null;
        let proposalPostId;
        let proposalId;
        let basePrice;

        if (req.body.type === 'offer') {
            if (!req.body.offerId) return res.status(400).json({ message: 'offerId is required' });
            if (!mongoose.Types.ObjectId.isValid(req.body.offerId)) {
                return res.status(400).json({ message: 'Invalid offerId' });
            }
            const offer = await Offer.findOne({ _id: req.body.offerId, isActive: true });
            if (!offer) return res.status(404).json({ message: 'Active offer not found' });
            if (offer.bookingDeadline && offer.bookingDeadline < new Date()) {
                return res.status(409).json({ message: 'This offer is no longer available' });
            }
            title = offer.title;
            companyId = offer.companyId;
            basePrice = offer.price;
            duplicateFilter.offerId = offer._id;
        } else if (req.body.type === 'proposal') {
            if (!req.body.postId || !req.body.proposalId) {
                return res.status(400).json({ message: 'postId and proposalId are required' });
            }
            if (
                !mongoose.Types.ObjectId.isValid(req.body.postId) ||
                !mongoose.Types.ObjectId.isValid(req.body.proposalId)
            ) {
                return res.status(400).json({ message: 'Invalid postId or proposalId' });
            }
            const post = await Post.findOne({
                _id: req.body.postId,
                userId: req.user.id,
                marketplaceStatus: 'locked',
                acceptedProposalId: req.body.proposalId
            });
            const proposal = post?.proposals?.id(req.body.proposalId);
            if (!post || !proposal || proposal.status !== 'approved') {
                return res.status(404).json({ message: 'Approved proposal not found' });
            }
            if (proposal.currency !== 'EGP') {
                return res.status(409).json({ message: 'Only EGP proposals can be booked' });
            }
            if (proposal.offerExpiry && proposal.offerExpiry < new Date()) {
                return res.status(409).json({ message: 'This proposal has expired' });
            }
            title = `${post.destination} - ${proposal.companyName}`.slice(0, 120);
            companyId = proposal.companyId;
            basePrice = proposal.price;
            travelDate = post.travelDate;
            proposalPostId = post._id;
            proposalId = proposal._id;
            duplicateFilter.proposalPostId = post._id;
            duplicateFilter.proposalId = proposal._id;
        } else {
            if (!req.body.attractionId) return res.status(400).json({ message: 'attractionId is required' });
            if (!mongoose.Types.ObjectId.isValid(req.body.attractionId)) {
                return res.status(400).json({ message: 'Invalid attractionId' });
            }
            const attraction = await Attraction.findOne({ _id: req.body.attractionId, isActive: true });
            if (!attraction) return res.status(404).json({ message: 'Active attraction not found' });
            const user = await User.findById(req.user.id).select('country');
            if (!user) return res.status(404).json({ message: 'User account not found' });
            const isEgyptian = String(user.country || '').trim().toLowerCase() === 'egypt';
            basePrice = isEgyptian ? attraction.prices.egyptian : attraction.prices.foreigner;
            title = attraction.name;
            duplicateFilter.attractionId = attraction._id;
        }

        const amount = calculatePayableAmount(basePrice, travelers);
        if (amount === null) {
            return res.status(409).json({ message: 'The selected booking has no valid price' });
        }
        duplicateFilter.travelDate = travelDate;

        const duplicate = await Booking.findOne({
            ...duplicateFilter,
            status: { $ne: 'cancelled' }
        });
        if (duplicate) {
            return res.status(409).json({ message: 'Duplicate booking is not allowed' });
        }

        const booking = await Booking.create({
            userId: req.user.id,
            type: req.body.type,
            title,
            offerId: req.body.type === 'offer' ? req.body.offerId : undefined,
            attractionId: req.body.type === 'attraction' ? req.body.attractionId : undefined,
            proposalPostId,
            proposalId,
            travelers,
            amount,
            currency: 'EGP',
            status: 'pending',
            paymentId: null,
            travelDate,
            companyId,
            contactInfo: getContactInfo(req.body.contactInfo)
        });

        if (req.body.offerId) {
            const offer = await Offer.findById(req.body.offerId).catch(() => null);
            const company = offer ? await Company.findById(offer.companyId).catch(() => null) : null;
            if (company?.userId) {
                await sendNotification(
                    company.userId,
                    'booking',
                    'New booking received',
                    `A user booked your offer "${offer?.title || booking.title}".`,
                    `/pages/company-dashboard.html`
                );
            }
        }

        await sendNotification(
            req.user.id,
            'booking',
            'Booking request created',
            `Your booking request for "${booking.title}" is pending payment.`,
            `/pages/bookings.html`
        );

        res.status(201).json({ message: 'Booking created and awaiting payment', booking });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Duplicate booking is not allowed' });
        }
        res.status(500).json({ message: 'Booking failed', error: err.message });
    }
};

// Get user bookings
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id })
            .populate('offerId')
            .populate('attractionId')
            .populate('companyId', 'companyName email governorate verified ministry rating reviews userId')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ bookings });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get company bookings (for company dashboard)
exports.getCompanyBookings = async (req, res) => {
    try {
        // Get the company associated with this user
        const company = await Company.findOne({ userId: req.user.id }).catch(() => null);
        if (!company) {
            return res.json({ bookings: [] });
        }

        const bookings = await Booking.find({ companyId: company._id })
            .populate('userId', 'fullName email phone')
            .populate('offerId')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ bookings });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get booking by id
exports.getById = async (req, res) => {
    try {
        const booking = req.user.role === 'admin'
            ? await Booking.findById(req.params.id)
                .populate('offerId')
                .populate('attractionId')
                .populate('companyId', 'companyName email governorate verified ministry rating reviews userId')
                .catch(() => null)
            : await Booking.findOne({ _id: req.params.id, userId: req.user.id })
                .populate('offerId')
                .populate('attractionId')
                .populate('companyId', 'companyName email governorate verified ministry rating reviews userId')
                .catch(() => null);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        res.json({ booking });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all bookings (admin)
exports.getAll = async (req, res) => {
    try {
        const bookings = await Booking.find().populate('userId').sort('-createdAt').catch(() => []);
        res.json({ bookings });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Update booking (owner or admin)
exports.update = async (req, res) => {
    try {
        if (['amount', 'currency', 'paymentId', 'status'].some(field => field in req.body)) {
            return res.status(400).json({ message: 'Booking price, payment, and status fields cannot be changed here' });
        }
        const filter = req.user.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, userId: req.user.id };

        const booking = await Booking.findOne(filter).catch(() => null);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.paymentId) {
            return res.status(409).json({ message: 'Bookings with an active checkout cannot be changed' });
        }
        if (booking.status === 'cancelled') {
            return res.status(409).json({ message: 'Cancelled bookings cannot be updated' });
        }

        if (req.body.travelDate) {
            const nextTravelDate = new Date(req.body.travelDate);
            if (Number.isNaN(nextTravelDate.getTime())) {
                return res.status(400).json({ message: 'Invalid travel date' });
            }
            booking.travelDate = nextTravelDate;
        }

        if (req.body.title !== undefined) booking.title = String(req.body.title).trim();
        if (req.body.travelers !== undefined) {
            const travelers = Number(req.body.travelers);
            if (!Number.isInteger(travelers) || travelers < 1 || travelers > 50) {
                return res.status(400).json({ message: 'Travelers must be a whole number between 1 and 50' });
            }
            booking.travelers = travelers;
        }
        if (req.body.contactInfo !== undefined) booking.contactInfo = getContactInfo(req.body.contactInfo);

        const duplicate = await Booking.findOne({
            _id: { $ne: booking._id },
            userId: booking.userId,
            type: booking.type,
            offerId: booking.offerId || undefined,
            attractionId: booking.attractionId || undefined,
            travelDate: booking.travelDate,
            status: { $ne: 'cancelled' }
        }).catch(() => null);
        if (duplicate) {
            return res.status(409).json({ message: 'Duplicate booking is not allowed' });
        }

        await booking.save();
        const updated = await Booking.findById(booking._id)
            .populate('offerId')
            .populate('attractionId')
            .populate('companyId', 'companyName email governorate verified ministry rating reviews userId')
            .catch(() => null);
        res.json({ message: 'Booking updated', booking: updated || booking });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

// Cancel booking
exports.cancel = async (req, res) => {
    try {
        const booking = await Booking.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, status: 'pending', paymentId: null },
            { status: 'cancelled' },
            { new: true }
        );
        if (!booking) {
            const existing = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
            if (!existing) return res.status(404).json({ message: 'Booking not found' });
            return res.status(409).json({ message: 'Only unpaid bookings without an active checkout can be cancelled' });
        }
        await sendNotification(
            req.user.id,
            'booking',
            'Booking cancelled',
            `Your booking "${booking.title}" was cancelled.`,
            `/pages/bookings.html`
        );
        res.json({ message: 'Booking cancelled', booking });
    } catch (err) {
        res.status(500).json({ message: 'Cancellation failed' });
    }
};

// Delete booking
exports.remove = async (req, res) => {
    try {
        const filter = req.user.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, userId: req.user.id };
        const existing = await Booking.findOne(filter);
        if (!existing) return res.status(404).json({ message: 'Booking not found' });
        if (existing.status !== 'pending' || existing.paymentId) {
            return res.status(409).json({ message: 'Paid or active-checkout bookings cannot be deleted' });
        }
        const booking = await Booking.findOneAndDelete({ ...filter, status: 'pending', paymentId: null });
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        res.json({ message: 'Booking deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed', error: err.message });
    }
};
