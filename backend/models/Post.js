// =================== POST MODEL (Tourist Travel Requests) ===================
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: String, required: true },
    budget: { type: Number, required: true },
    travelers: { type: Number, default: 1 },
    travelDate: { type: Date, required: true },
    requiredText: { type: String, required: true },
    attractions: [{
        attractionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction' },
        name: String
    }],
    description: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    // Post lifecycle: open → locked (proposal approved, awaiting payment) → closed (paid)
    marketplaceStatus: { type: String, enum: ['open', 'locked', 'closed'], default: 'open' },
    lockedAt: { type: Date, default: null },
    acceptedProposalId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Duration in days (optional)
    duration: { type: Number, default: null },
    sourceType: { type: String, enum: ['manual', 'trip_plan', 'share'], default: 'manual' },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Yala Plan itinerary (stored inline for company visibility)
    tripItinerary: [{
        day: Number,
        destination: String,
        morning: String,
        afternoon: String,
        evening: String,
        accommodation: String
    }],
    tripStyle: { type: String, default: null },
    comments: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['user', 'company', 'admin'], required: true },
        name: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    offers: [{
        companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        companyName: { type: String, required: true },
        price: { type: Number, required: true },
        details: { type: String, required: true },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now },
        acceptedAt: Date
    }],
    // Company trip proposals — premium structured offers
    proposals: [{
        companyId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        companyName:       { type: String, required: true },
        companyLogo:       { type: String },
        companyWhatsApp:   { type: String },
        contactPerson:     { type: String },
        verified:          { type: Boolean, default: false },
        // Pricing
        price:             { type: Number, required: true },
        currency:          { type: String, default: 'EGP' },
        // Trip details
        days:              { type: Number },
        nights:            { type: Number },
        hotelName:         { type: String },
        hotelRating:       { type: Number, min: 1, max: 5 },
        transportation:    { type: String },
        mealsIncluded:     { type: String },
        // Places & inclusions
        attractions:       [{ name: String }],
        included:          { type: String },
        notIncluded:       { type: String },
        // Description
        description:       { type: String, required: true },
        specialNotes:      { type: String },
        // Dates
        offerExpiry:       { type: Date },
        estimatedResponse: { type: String },
        // Attachments
        images:            [String],
        pdfUrl:            { type: String },
        // Status
        status:            { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        savedBy:           [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdAt:         { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
