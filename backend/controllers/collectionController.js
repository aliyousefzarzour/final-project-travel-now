const Favorite = require('../models/Favorite');
const SavedTrip = require('../models/SavedTrip');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

exports.getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.find({ userId: req.user.id })
            .populate('attractionId')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ favorites });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.addFavorite = async (req, res) => {
    try {
        const favorite = await Favorite.create({
            userId: req.user.id,
            attractionId: req.body.attractionId,
            note: req.body.note || ''
        });
        res.status(201).json({ message: 'Favorite added', favorite });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Already in favorites' });
        }
        res.status(500).json({ message: 'Unable to add favorite', error: err.message });
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        const removed = await Favorite.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        }).catch(() => null);
        if (!removed) return res.status(404).json({ message: 'Favorite not found' });
        res.json({ message: 'Favorite removed' });
    } catch (err) {
        res.status(500).json({ message: 'Unable to remove favorite', error: err.message });
    }
};

exports.removeFavoriteByAttraction = async (req, res) => {
    try {
        const removed = await Favorite.findOneAndDelete({
            attractionId: req.params.attractionId,
            userId: req.user.id
        }).catch(() => null);
        if (!removed) return res.status(404).json({ message: 'Favorite not found' });
        res.json({ message: 'Favorite removed' });
    } catch (err) {
        res.status(500).json({ message: 'Unable to remove favorite', error: err.message });
    }
};

exports.checkFavorite = async (req, res) => {
    try {
        const fav = await Favorite.findOne({
            attractionId: req.params.attractionId,
            userId: req.user.id
        }).catch(() => null);
        res.json({ isFavorite: !!fav, favoriteId: fav ? fav._id : null });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getTrips = async (req, res) => {
    try {
        const trips = await SavedTrip.find({ userId: req.user.id })
            .populate('attractions.attractionId')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ trips });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.createTrip = async (req, res) => {
    try {
        const trip = await SavedTrip.create({
            userId: req.user.id,
            title: req.body.title,
            budget: req.body.budget,
            travelers: req.body.travelers,
            days: req.body.days,
            style: req.body.style,
            destination: req.body.destination || '',
            attractions: req.body.attractions || [],
            itinerary: req.body.itinerary || [],
            sourcePostId: req.body.sourcePostId || null
        });
        res.status(201).json({ message: 'Trip saved', trip });
    } catch (err) {
        res.status(500).json({ message: 'Unable to save trip', error: err.message });
    }
};

exports.updateTrip = async (req, res) => {
    try {
        const trip = await SavedTrip.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            req.body,
            { new: true }
        ).catch(() => null);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });
        res.json({ message: 'Trip updated', trip });
    } catch (err) {
        res.status(500).json({ message: 'Unable to update trip', error: err.message });
    }
};

exports.deleteTrip = async (req, res) => {
    try {
        const trip = await SavedTrip.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        }).catch(() => null);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });
        res.json({ message: 'Trip deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Unable to delete trip', error: err.message });
    }
};

exports.getProfileSummary = async (req, res) => {
    try {
        const [bookings, favorites, trips, notifications] = await Promise.all([
            Booking.countDocuments({ userId: req.user.id }).catch(() => 0),
            Favorite.countDocuments({ userId: req.user.id }).catch(() => 0),
            SavedTrip.countDocuments({ userId: req.user.id }).catch(() => 0),
            Notification.countDocuments({ userId: req.user.id, isRead: false }).catch(() => 0)
        ]);

        res.json({
            summary: {
                bookings,
                favorites,
                trips,
                notifications
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Unable to load profile summary', error: err.message });
    }
};
