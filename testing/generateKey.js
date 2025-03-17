import crypto from 'crypto';

function generateEsp32Key() {
    return crypto.randomBytes(32).toString('hex'); // Genera una chiave random a 256 bit
}

const esp32Key = generateEsp32Key();
console.log("Generated ESP32 Key:", esp32Key);

// CURRENT KEY 17 MAR 
// e17c9d5c6c7bc84123c0a4caeef53d4f246fb8ce22f39aad71bc5dde2e982921