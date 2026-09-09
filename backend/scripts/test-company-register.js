require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const FormData = require('form-data');
const https = require('http');
const fs = require('fs');
const path = require('path');

// Create a minimal test image buffer
const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const form = new FormData();
form.append('companyName', 'Test Company');
form.append('ownerName', 'Ali Test');
form.append('email', `testcompany_${Date.now()}@test.com`);
form.append('phone', '+201234567890');
form.append('whatsapp', '+201234567890');
form.append('governorate', 'Cairo');
form.append('address', '123 Test Street, Cairo');
form.append('commercialReg', 'CR-12345');
form.append('taxCard', 'TC-12345');
form.append('tourismLicense', 'TL-12345');
form.append('ministryLicense', 'ML-12345');
form.append('experience', '5');
form.append('description', 'Test company description');
form.append('services', 'Test services');
form.append('password', 'TestPass123!');
form.append('logo', testImageBuffer, { filename: 'logo.png', contentType: 'image/png' });
form.append('docCommercial', testImageBuffer, { filename: 'commercial.png', contentType: 'image/png' });
form.append('docTourism', testImageBuffer, { filename: 'tourism.png', contentType: 'image/png' });
form.append('docTax', testImageBuffer, { filename: 'tax.png', contentType: 'image/png' });

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/companies/register',
    method: 'POST',
    headers: form.getHeaders()
};

console.log('Testing POST /api/companies/register...');
const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        if (res.statusCode === 201) {
            console.log('✅ Registration successful!');
            console.log('  Company:', parsed.company?.companyName);
            console.log('  Email:', parsed.company?.email);
            console.log('  Status:', parsed.company?.status);
            console.log('  requiresEmailVerification:', parsed.requiresEmailVerification);
        } else {
            console.log('❌ Registration failed:', res.statusCode);
            console.log('  Message:', parsed.message || parsed.error);
        }
    });
});

req.on('error', e => console.error('❌ Request error:', e.message));
form.pipe(req);
