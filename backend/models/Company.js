// =================== COMPANY MODEL ===================
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    companyName: { type: String, required: true },
    ownerName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    whatsapp: { type: String, required: true },
    website: String,

    // Address
    address: { type: String, required: true },
    governorate: { type: String, required: true },
    country: { type: String, default: 'Egypt' },
    location: String,

    // Licenses
    commercialReg: { type: String, required: true },
    taxCard: { type: String, required: true },
    tourismLicense: { type: String, required: true },
    ministryLicense: { type: String, required: true },
    iata: String,

    // Profile
    experience: { type: Number, default: 0 },
    employees: { type: Number, default: 1 },
    description: { type: String, required: true },
    services: String,
    packages: String,

    // Documents
    logo: String,
    documents: {
        commercial: String,
        tax: String,
        tourism: String,
        ministry: String,
        ownerId: String
    },

    // Status
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'blocked'], default: 'pending' },
    blockedReason: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    ministry: { type: Boolean, default: false },
    trusted: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },

    // Stats
    totalOffers: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
