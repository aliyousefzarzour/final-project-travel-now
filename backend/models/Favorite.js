const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attractionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction', required: true, index: true },
    note: { type: String, default: '' }
}, { timestamps: true });

favoriteSchema.index({ userId: 1, attractionId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
