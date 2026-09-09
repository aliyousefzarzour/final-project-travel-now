// =================== USER MODEL ===================
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName:  { type: String, required: true, trim: true },
    username:  { type: String, required: true, trim: true },   // removed unique
    email:     { type: String, required: true, lowercase: true, trim: true },  // removed unique
    country:   { type: String, default: 'Unknown' },
    phone:     { type: String, default: null },
    password:  {
        type: String,
        required: function() { return this.authProvider === 'local' || !this.authProvider; },
        minlength: 6,
        select: false
    },
    profilePicture: { type: String, default: null },
    googleId:  { type: String, sparse: true },                 // removed unique
    authProvider: { type: String, enum: ['local','google'], default: 'local' },
    role:      { type: String, enum: ['tourist','company','admin'], default: 'tourist' },
    isActive:  { type: Boolean, default: true },
    isBanned:  { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attraction' }],
    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.password || !this.isModified('password')) return next();
    try { this.password = await bcrypt.hash(this.password, 12); next(); }
    catch (err) { next(err); }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
