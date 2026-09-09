// =================== TRIP PLAN MODEL ===================
const mongoose = require('mongoose');

const tripPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    budget: Number,
    travelers: Number,
    days: Number,
    style: String,
    destinations: [String],
    itinerary: [{
        day: Number,
        morning: String,
        afternoon: String,
        evening: String,
        accommodation: String
    }],
    estimatedCost: Number
}, { timestamps: true });

module.exports = mongoose.model('TripPlan', tripPlanSchema);
