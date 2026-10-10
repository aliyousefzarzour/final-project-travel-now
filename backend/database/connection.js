// =================== DATABASE CONNECTION ===================
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../config');

let memoryServer = null;

async function createLocalMongoInstance() {
    try {
        memoryServer = await MongoMemoryServer.create({
            instance: { dbName: 'travelnow' },
            binary: { version: '7.0.14' }
        });
        return memoryServer.getUri();
    } catch (error) {
        console.warn('MongoMemoryServer unavailable, falling back to the configured MongoDB URI.');
        console.warn(error.message || 'Memory Mongo startup failed');
        return config.MONGODB_URI;
    }
}

const connectDB = async () => {
    const maxAttempts = 5;
    const useLocalFallback = !process.env.MONGODB_URI &&
        (!config.MONGODB_URI || /localhost:27017/.test(config.MONGODB_URI));

    let mongoUri = config.MONGODB_URI;

    if (useLocalFallback) {
        mongoUri = await createLocalMongoInstance();
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await mongoose.connect(mongoUri, {
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
