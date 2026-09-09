// =================== PAYMENT MODEL (PCI-DSS Compliant) ===================
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },

    // Gateway info (NEVER store full card numbers)
    gateway: { type: String, default: 'stripe' },
    transactionId: { type: String, required: true },
    paymentIntentId: String,

    // Card info (only masked)
    cardBrand: { type: String }, // visa, mastercard, meeza
    cardLast4: { type: String, maxlength: 4 },
    cardExpMonth: Number,
    cardExpYear: Number,

    amount: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending' },
    billingAddress: String,

    // Metadata
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

// Remove any sensitive fields from JSON output
paymentSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.cardNumber; // Safety: never include
    delete obj.cvv;
    return obj;
};

module.exports = mongoose.model('Payment', paymentSchema);
