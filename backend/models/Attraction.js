// =================== ATTRACTION MODEL ===================
const mongoose = require('mongoose');

const attractionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: {
        type: String,
        enum: ['historical', 'religious', 'museums', 'beach', 'adventure', 'natural', 'cultural'],
        required: true
    },
    description: { type: String, required: true },
    images: [String],
    videos: [String],
    location: { type: String, required: true },
    governorate: { type: String, required: true },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    openingHours: String,
    prices: {
        egyptian: { type: Number, default: 0 },
        foreigner: { type: Number, default: 0 }
    },
    nearbyHotels: [String],
    nearbyRestaurants: [String],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Attraction', attractionSchema);
