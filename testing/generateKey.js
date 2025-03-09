import crypto from 'crypto';

function generateEsp32Key() {
    return crypto.randomBytes(32).toString('hex'); // Genera una chiave random a 256 bit
}

const esp32Key = generateEsp32Key();
console.log("Generated ESP32 Key:", esp32Key);
