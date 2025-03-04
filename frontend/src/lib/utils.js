// src/lib/utils.js

/**
 * Convert a hex string (without 0x) to a binary string.
 */
export function hexToBin(hex) {
  return hex
    .split('')
    .map(c => parseInt(c, 16).toString(2).padStart(4, '0'))
    .join('');
}

/**
 * Convert a binary string to a hex string.
 */
export function binToHex(binStr) {
  let hex = "";
  for (let i = 0; i < binStr.length; i += 4) {
    hex += parseInt(binStr.substr(i, 4), 2).toString(16);
  }
  return hex;
}

/**
 * Convert a bit string into a Uint8Array (each 8 bits → 1 byte).
 */
export function bitsToUint8Array(bitStr) {
  const bytes = [];
  for (let i = 0; i < bitStr.length; i += 8) {
    const byte = bitStr.substr(i, 8);
    bytes.push(parseInt(byte.padEnd(8, '0'), 2));
  }
  return new Uint8Array(bytes);
}

/**
 * Convert a Uint8Array to a bit string.
 */
export function uint8ArrayToBits(uint8arr) {
  let bits = "";
  uint8arr.forEach(byte => {
    bits += byte.toString(2).padStart(8, '0');
  });
  return bits;
}

/**
 * Convert a Uint8Array to a hex string.
 */
export function uint8ArrayToHex(uint8arr) {
  return Array.from(uint8arr)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a 16-bit binary string to a signed integer.
 */
export function bin16ToSigned(binStr) {
  if (binStr[0] === '1') {
    let inverted = "";
    for (let bit of binStr) {
      inverted += bit === '0' ? '1' : '0';
    }
    return -(parseInt(inverted, 2) + 1);
  }
  return parseInt(binStr, 2);
}

/**
 * Convert a Unix timestamp (in seconds) to a readable UTC string.
 */
export function formatTimestamp(ts) {
  const date = new Date(Number(ts) * 1000);
  return date.toUTCString();
}

/**
 * Convert a date string ("YYYY-MM-DD") to a Unix timestamp (seconds) for the start of that day (UTC).
 */
export function computeDateKey(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return Math.floor(Date.UTC(year, month - 1, day) / 1000);
}
