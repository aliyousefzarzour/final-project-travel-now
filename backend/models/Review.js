// =================== REVIEW MODEL ===================
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['attraction', 'company', 'hotel'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    targetModel: { type: String, enum: ['Attraction', 'Company', 'Hotel'], required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    photos: [String]
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
