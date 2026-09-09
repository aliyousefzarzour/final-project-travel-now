require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await mongoose.connection.collection('users').updateMany(
        { isEmailVerified: { $ne: true } },
        { $set: { isEmailVerified: true } }
    );
    console.log('✅ Updated:', result.modifiedCount, 'users set to isEmailVerified: true');
    await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
