// src/lib/payload.js
import { hexToBin, bin16ToSigned } from "./utils.js";

/**
 * Decode a payload hex string into an array of 40-bit blocks.
 *   - Bit 0: encryption flag
 *   - Bits 1-3: padding (ignored)
 *   - Bits 4-7: sensor type (for clear blocks)
 *   - Bits 8-39: sensor data (32 bits)
 */
export function decodePayload(payloadHex) {
  if (payloadHex.startsWith("0x")) payloadHex = payloadHex.slice(2);
  const blockHexLen = 10; // 5 bytes = 40 bits
  const blocks = [];
  for (let i = 0; i < payloadHex.length; i += blockHexLen) {
    const blockHex = payloadHex.substr(i, blockHexLen);
    const blockBin = hexToBin(blockHex); // 40 bits
    const encrypted = blockBin[0] === '1';
    // For clear blocks, we can read sensor type directly from bits 4-7.
    const sensorType = encrypted ? null : parseInt(blockBin.substr(4, 4), 2);
    const payloadBits = blockBin.substr(1, 39);
    blocks.push({ blockHex, encrypted, sensorType, payloadBits });
  }
  return blocks;
}

/**
 * Extract sensor values from a clear 39-bit payload:
 *   - bits 0-2: padding
 *   - bits 3-6: sensor type
 *   - bits 7-38: 32-bit sensor data
 */
export function extractSensorValues(clearPayload39) {
  const sensorType = parseInt(clearPayload39.substr(3, 4), 2);
  const dataBits = clearPayload39.substr(7, 32);

  if (sensorType === 1) {
    // DHT11: temperature and humidity
    const tempBits = dataBits.substr(0, 16);
    const humBits = dataBits.substr(16, 16);
    return {
      sensorType,
      label: "DHT11",
      temperature: (parseInt(tempBits, 2) / 100).toFixed(2),
      humidity: (parseInt(humBits, 2) / 100).toFixed(2),
    };
  } else if (sensorType === 2) {
    // Accelerometer: acceleration value
    const accelVal = parseInt(dataBits, 2);
    return {
      sensorType,
      label: "Accelerometer",
      acceleration: (accelVal / 100).toFixed(2),
    };
  } else if (sensorType === 3) {
    // Gyroscope: two signed 16-bit values
    const xBits = dataBits.substr(0, 16);
    const yBits = dataBits.substr(16, 16);
    const xVal = bin16ToSigned(xBits);
    const yVal = bin16ToSigned(yBits);
    return {
      sensorType,
      label: "Gyroscope",
      gyroX: (xVal / 100).toFixed(2),
      gyroY: (yVal / 100).toFixed(2),
      gyroZ: "N/A",
    };
  } else {
    return {
      sensorType,
      label: "Unknown",
    };
  }
}

/**
 * Translate an array of blocks into an array of sensor readings.
 * If a block is encrypted and not yet decrypted, return a placeholder.
 */
export function translateBlocks(blocks) {
  return blocks.map(block => {
    const clearPayload = block.encrypted && block.decryptedClearPayload
      ? block.decryptedClearPayload
      : !block.encrypted
        ? block.payloadBits
        : null;

    if (!clearPayload) {
      return { sensorType: block.sensorType, label: "Encrypted (not decrypted)", blockHex: block.blockHex };
    }
    const sensorValues = extractSensorValues(clearPayload);
    return { ...sensorValues, blockHex: block.blockHex };
  });
}
