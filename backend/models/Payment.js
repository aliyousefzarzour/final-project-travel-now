// =================== PAYMENT MODEL (PCI-DSS Compliant) ===================
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },

    // Gateway info (NEVER store full card numbers)
    gateway: { type: String, default: 'paymob' },
    transactionId: String,
    paymentIntentId: String,
    paymentAttemptId: { type: String, required: true, unique: true, sparse: true },
    paymobIntentionId: String,
    paymobOrderId: { type: String, sparse: true, unique: true },
    paymobTransactionId: { type: String, sparse: true, unique: true },
    amountCents: { type: Number, required: true },
    checkoutExpiresAt: Date,

    // Card info (only masked)
    cardBrand: { type: String }, // visa, mastercard, meeza
    cardLast4: { type: String, maxlength: 4 },
    cardExpMonth: Number,
    cardExpYear: Number,

    amount: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'cancelled', 'refunded'], default: 'pending' },
    billingAddress: String,

    // Metadata
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

paymentSchema.index({ bookingId: 1, status: 1 });

// Remove any sensitive fields from JSON output
paymentSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.cardNumber; // Safety: never include
    delete obj.cvv;
    return obj;
};

module.exports = mongoose.model('Payment', paymentSchema);
