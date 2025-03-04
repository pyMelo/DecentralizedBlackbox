// src/lib/decryption.js
import { bitsToUint8Array, uint8ArrayToBits } from "./utils.js";

/**
 * Compute the daily key from a master key (hex) and a day string (e.g. "2025-02-25").
 */
// In src/lib/decryption.js (or inline in Dashboard.js)
export async function computeDailyKey(masterKeyHex, dayStr) {
  // Remove a "0x" prefix if present.
  if (masterKeyHex.startsWith('0x')) {
    masterKeyHex = masterKeyHex.slice(2);
  }
  const masterKeyBuffer = new Uint8Array(
    masterKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
  const encoder = new TextEncoder(); // uses UTF-8 by default
  const dayBuffer = encoder.encode(dayStr);
  const concatBuffer = new Uint8Array(masterKeyBuffer.length + dayBuffer.length);
  concatBuffer.set(masterKeyBuffer);
  concatBuffer.set(dayBuffer, masterKeyBuffer.length);
  const hashBuffer = await crypto.subtle.digest("SHA-256", concatBuffer);
  return new Uint8Array(hashBuffer); // 32 bytes
}


/**
 * Decrypt an encrypted block’s 39-bit payload using AES-256-CTR with a zero IV.
 * The encrypted payload is padded to a full byte length.
 * Returns the first 39 bits of the decrypted bit string.
 */
export async function decryptBlock(encryptedPayloadBits39, dailyKey) {
  const paddedLength = Math.ceil(encryptedPayloadBits39.length / 8) * 8;
  const paddedBits = encryptedPayloadBits39.padEnd(paddedLength, '0');
  const encryptedBytes = bitsToUint8Array(paddedBits);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    dailyKey,
    { name: "AES-CTR" },
    false,
    ["decrypt"]
  );
  const iv = new Uint8Array(16); // 16 zero bytes
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CTR", counter: iv, length: 128 },
    cryptoKey,
    encryptedBytes
  );
  const decryptedBits = uint8ArrayToBits(new Uint8Array(decryptedBuffer));
  return decryptedBits.substr(0, 39);
}
