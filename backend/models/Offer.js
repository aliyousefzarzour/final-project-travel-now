// =================== OFFER MODEL ===================
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['domestic', 'international', 'hajj', 'umrah'], required: true },
    destination: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    duration: String,
    availableSeats: { type: Number, required: true },
    bookingDeadline: Date,
    images: [String],
    isActive: { type: Boolean, default: true },
    bookedSeats: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
