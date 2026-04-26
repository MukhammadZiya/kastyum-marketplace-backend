const crypto = require('crypto');

function generateTelegramHash(data, botToken) {
    const { hash, ...dataToVerify } = data;
    const dataCheckString = Object.keys(dataToVerify)
        .sort()
        .map((key) => `${key}=${dataToVerify[key]}`)
        .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return hmac;
}

const botToken = 'YOUR_BOT_TOKEN_HERE';
const testData = {
    id: 123456,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    photo_url: 'https://example.com/photo.jpg',
    auth_date: Math.floor(Date.now() / 1000),
};

const hash = generateTelegramHash(testData, botToken);
console.log('Test Data:', { ...testData, hash });
