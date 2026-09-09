// =================== BOOKING MODEL ===================
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    attractionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction' },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },

    type: { type: String, enum: ['offer', 'attraction'], required: true },
    title: { type: String, required: true },
    travelers: { type: Number, default: 1 },
    travelDate: Date,

    amount: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    paymentId: String,

    contactInfo: {
        name: String,
        email: String,
        phone: String
    }
}, { timestamps: true });

bookingSchema.index(
    { userId: 1, type: 1, offerId: 1, attractionId: 1, travelDate: 1 },
    { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } }
);

module.exports = mongoose.model('Booking', bookingSchema);
