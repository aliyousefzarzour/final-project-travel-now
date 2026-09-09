// =================== HOTEL MODEL ===================
const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    governorate: { type: String, required: true },
    address: String,
    stars: { type: Number, min: 1, max: 5 },
    pricePerNight: Number,
    amenities: [String],
    images: [String],
    coordinates: {
        lat: Number,
        lng: Number
    },
    contactPhone: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Hotel', hotelSchema);
