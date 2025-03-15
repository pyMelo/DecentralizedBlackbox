import crypto from 'crypto';

function generateEsp32Key() {
    return crypto.randomBytes(32).toString('hex'); // Genera una chiave random a 256 bit
}

const esp32Key = generateEsp32Key();
console.log("Generated ESP32 Key:", esp32Key);

// CURRENT KEY 14 MAR 
// 7d9ebe8da3a1b336e7a0a559e176b5b7624d74fdced00b34f3c34871e8efe1cb
// DAILY KEY 1 :
//  

// CONTRATTO : 0x502F98a7984DfD7223072093eEb5B1F3e4f4835f