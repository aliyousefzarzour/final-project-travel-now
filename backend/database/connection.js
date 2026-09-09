// =================== DATABASE CONNECTION ===================
const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await mongoose.connect(config.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000
            });
            console.log('MongoDB connected successfully');
            return true;
        } catch (err) {
            console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed:`, err.message);

            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            }
        }
    }

    console.warn('Running in demo/degraded mode without a database connection');
    return false;
};

module.exports = connectDB;
