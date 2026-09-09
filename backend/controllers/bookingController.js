// =================== BOOKING CONTROLLER ===================
const Booking = require('../models/Booking');
const Company = require('../models/Company');
const Offer = require('../models/Offer');
const { send: sendNotification } = require('./notificationController');

// Create booking
exports.create = async (req, res) => {
    try {
        if (!req.body.type || !['offer', 'attraction'].includes(req.body.type)) {
            return res.status(400).json({ message: 'Booking type is required' });
        }
        if (!req.body.title || !String(req.body.title).trim()) {
            return res.status(400).json({ message: 'Booking title is required' });
        }
        if (req.body.amount === undefined || req.body.amount === null || Number(req.body.amount) < 0) {
            return res.status(400).json({ message: 'Booking amount must be 0 or more' });
        }

        const travelDate = req.body.travelDate ? new Date(req.body.travelDate) : null;
        if (travelDate && Number.isNaN(travelDate.getTime())) {
            return res.status(400).json({ message: 'Invalid travel date' });
        }

        const duplicateFilter = {
            userId: req.user.id,
            type: req.body.type,
            travelDate: travelDate
        };
        if (req.body.offerId) duplicateFilter.offerId = req.body.offerId;
        if (req.body.attractionId) duplicateFilter.attractionId = req.body.attractionId;

        const duplicate = await Booking.findOne({
            ...duplicateFilter,
            status: { $ne: 'cancelled' }
        }).catch(() => null);
        if (duplicate) {
            return res.status(409).json({ message: 'Duplicate booking is not allowed' });
        }

        // Ensure companyId is extracted from offer if not provided
        let companyId = req.body.companyId || null;
        if (!companyId && req.body.offerId) {
            const offer = await Offer.findById(req.body.offerId).catch(() => null);
            if (offer?.companyId) {
                companyId = offer.companyId;
            }
        }

        const booking = await Booking.create({
            ...req.body,
            title: String(req.body.title).trim(),
            amount: Number(req.body.amount),
            travelDate,
            userId: req.user.id,
            companyId: companyId
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
            'Booking confirmed',
            `Your booking for "${booking.title}" has been created.`,
            `/pages/bookings.html`
        );

        res.status(201).json({ message: 'Booking created', booking });
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
        const filter = req.user.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, userId: req.user.id };

        const booking = await Booking.findOne(filter).catch(() => null);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
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
        if (req.body.travelers !== undefined) booking.travelers = Number(req.body.travelers);
        if (req.body.amount !== undefined) booking.amount = Number(req.body.amount);
        if (req.body.currency !== undefined) booking.currency = req.body.currency;
        if (req.body.status !== undefined) booking.status = req.body.status;
        if (req.body.contactInfo !== undefined) booking.contactInfo = req.body.contactInfo;

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
            { _id: req.params.id, userId: req.user.id },
            { status: 'cancelled' },
            { new: true }
        );
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
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
        const booking = req.user.role === 'admin'
            ? await Booking.findByIdAndDelete(req.params.id).catch(() => null)
            : await Booking.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).catch(() => null);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        res.json({ message: 'Booking deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed', error: err.message });
    }
};
