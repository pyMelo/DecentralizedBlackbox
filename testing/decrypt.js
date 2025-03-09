// decodifica_payload_completo.js

import crypto from 'crypto';
// Daily Key in formato esadecimale (16 byte per AES-128)
const dailyKeyHex = "c97ab83ab1d0a21b8dff049f225a1741";
const dailyKey = Buffer.from(dailyKeyHex, 'hex');

// Esempio di payload finale (36 byte) in esadecimale.
// Puoi rimuovere gli spazi se presenti.
const payloadHex = "01 00 16 02 00 53 03 FF F3 00 00 FF FE 01 00 00 00 8B 0B 9D 00 45 4C B8 95 20 F0 E1 D7 80 DF 31 8C CB 8A 17";
// Rimuove spazi e converte in Buffer
const payloadStr = payloadHex.replace(/\s+/g, '');
const payload = Buffer.from(payloadStr, 'hex');

if (payload.length !== 36) {
    console.error("Errore: il payload deve essere lungo 36 byte.");
    process.exit(1);
}

// --- Decodifica dei dati in chiaro --- //

// Temperatura
const markerTemp = payload[0];
const temperature = payload.readUInt16BE(1); // byte 1-2
// Umidità
const markerHumidity = payload[3];
const humidity = payload.readUInt16BE(4); // byte 4-5
// Giroscopio
const markerGyro = payload[6];
const gyroX = payload.readInt16BE(7);  // byte 7-8
const gyroY = payload.readInt16BE(9);  // byte 9-10
const gyroZ = payload.readInt16BE(11); // byte 11-12

// IV effective (byte 13-28, 16 byte)
const effectiveIV = payload.slice(13, 29);

// Flag di cifratura (byte 29)
const encryptionFlag = payload[29];

// Blocco cifrato (byte 30-35, 6 byte)
const encryptedBlock = payload.slice(30, 36);

// --- Decriptazione del blocco cifrato --- //

const decipher = crypto.createDecipheriv('aes-128-ctr', dailyKey, effectiveIV);
let decryptedBlock = decipher.update(encryptedBlock);
decryptedBlock = Buffer.concat([decryptedBlock, decipher.final()]);

// Interpretiamo il blocco decriptato:
const markerAccel = decryptedBlock[0];
const accelVal = decryptedBlock.readInt16BE(1); // byte 1-2
const markerLatLong = decryptedBlock[3];
const latitude = decryptedBlock[4];
const longitude = decryptedBlock[5];

// --- Output --- //
console.log("=== Dati in chiaro ===");
console.log("Marker Temperatura:", "0x" + markerTemp.toString(16));
console.log("Temperatura:", temperature, "°C");

console.log("Marker Umidità:", "0x" + markerHumidity.toString(16));
console.log("Umidità:", humidity, "%");

console.log("Marker Giroscopio:", "0x" + markerGyro.toString(16));
console.log("Giroscopio X:", gyroX, "->", (gyroX / 100).toFixed(2), "°/s");
console.log("Giroscopio Y:", gyroY, "->", (gyroY / 100).toFixed(2), "°/s");
console.log("Giroscopio Z:", gyroZ, "->", (gyroZ / 100).toFixed(2), "°/s");

console.log("\nEffective IV:", effectiveIV.toString('hex'));
console.log("Flag di cifratura:", "0x" + encryptionFlag.toString(16));

console.log("\n=== Blocco cifrato e decriptato ===");
console.log("Blocco cifrato:", encryptedBlock.toString('hex'));
console.log("Blocco decriptato:", decryptedBlock.toString('hex'));

console.log("\n--- Interpretazione del Blocco Decriptato ---");
console.log("Marker Accelerometro:", "0x" + markerAccel.toString(16));
console.log("Valore Accelerometro:", accelVal, "->", (accelVal / 100).toFixed(2));
console.log("Marker LatLong:", "0x" + markerLatLong.toString(16));
console.log("Latitudine:", latitude);
console.log("Longitudine:", longitude);
