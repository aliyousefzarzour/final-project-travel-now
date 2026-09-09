const mongoose = require('mongoose');

const savedTripSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    budget: { type: Number, required: true },
    travelers: { type: Number, required: true },
    days: { type: Number, required: true },
    style: { type: String, required: true },
    destination: { type: String, default: '' },
    attractions: [{
        attractionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction' },
        name: String
    }],
    itinerary: [{ day: Number, morning: String, afternoon: String, evening: String, accommodation: String }],
    sourcePostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null }
}, { timestamps: true });

module.exports = mongoose.model('SavedTrip', savedTripSchema);
