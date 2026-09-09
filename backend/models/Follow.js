// =================== FOLLOW MODEL ===================
const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

// One user can follow a company only once
followSchema.index({ userId: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('Follow', followSchema);
