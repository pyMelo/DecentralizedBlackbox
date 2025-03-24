// utils/crypto.js - Funzioni di crittografia condivise

export const getEpochUTC = (dateStr) => {
    const utcString = `${dateStr}T00:00:00Z`
    return Math.floor(new Date(utcString).getTime() / 1000)
  }
  
  export const hexStringToBytes = (hexString) => {
    const clean = hexString.replace(/\s+/g, "")
    const length = clean.length / 2
    const result = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      result[i] = Number.parseInt(clean.substr(i * 2, 2), 16)
    }
    return result
  }
  
  export const bytesToHex = (bytes) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  
  export const sha256 = async (data) => {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    return new Uint8Array(hashBuffer)
  }
  
  export const epochToBytesBE = (epoch) => {
    const bytes = new Uint8Array(8)
    for (let i = 7; i >= 0; i--) {
      bytes[i] = epoch % 256
      epoch = Math.floor(epoch / 256)
    }
    return bytes
  }
  
  export const hexToUtf8 = (hex) => {
    try {
      return decodeURIComponent(
        hex.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&')
      );
    } catch (e) {
      console.error("❌ Errore durante la decodifica da Hex a UTF-8:", e);
      return hex;
    }
  };
  
  export const asciiToBytes = (str) => new TextEncoder().encode(str)
  
  export const concatUint8Arrays = (...arrays) => {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    arrays.forEach((arr) => {
      result.set(arr, offset)
      offset += arr.length
    })
    return result
  }
  
  // Funzione condivisa per generare la chiave giornaliera
  export const generateDailyKeySHA256 = async (masterKeyHex, vehicleId, initDate, fetchDate) => {
    // Usa variabili locali per non modificare i parametri
    const mk = masterKeyHex.trim().toLowerCase()
    const vid = vehicleId.trim()
  
    const initEpoch = getEpochUTC(initDate)
    const fetchEpoch = getEpochUTC(fetchDate)
    const diffDays = Math.max(0, Math.floor((fetchEpoch - initEpoch) / 86400))
  
    console.log("Initial Epoch:", initEpoch)
    console.log("Fetch Epoch:", fetchEpoch)
    console.log("Diff Days:", diffDays)
  
    const masterKeyBytes = hexStringToBytes(mk)
    const vehicleIdBytes = asciiToBytes(vid)
    const initEpochBytes = epochToBytesBE(initEpoch)
  
    // Crea l'array di dati da hashare
    const data = concatUint8Arrays(masterKeyBytes, vehicleIdBytes, initEpochBytes)
    
    const hash = await sha256(data)
    let dailyKey = hash.slice(0, 16)
  
    // Genera le successive Daily Key
    for (let i = 0; i < diffDays; i++) {
      const nextEpoch = initEpoch + (i + 1) * 86400
      const nextEpochBytes = epochToBytesBE(nextEpoch)
      const iterationData = concatUint8Arrays(dailyKey, vehicleIdBytes, nextEpochBytes)
      const iterationHash = await sha256(iterationData)
      dailyKey = iterationHash.slice(0, 16)
    }
  
    return bytesToHex(dailyKey)
  }
  
  // Funzione per decrittare i dati con AES-CTR
  export const decryptWithAES = async (encryptedBytes, effectiveIV, dailyKeyHex) => {
    const keyBuffer = hexStringToBytes(dailyKeyHex)
    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-CTR" }, false, ["decrypt"])
    
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-CTR", counter: effectiveIV, length: 128 },
        cryptoKey,
        encryptedBytes
      )
      return new Uint8Array(decryptedBuffer)
    } catch (error) {
      console.error("Decryption error:", error)
      return null
    }
  }
  export const fetchAndDecryptIotaBlock = async (blockId, masterKeyHex, vehicleId, initDate, fetchDate) => {
  try {
    console.log(`🔍 Fetching IOTA block: ${blockId}`);
    const response = await fetch(`https://api.testnet.iotaledger.net/api/core/v2/blocks/${blockId}`);
    if (!response.ok) {
      console.error("❌ Error fetching IOTA block:", response.status);
      return null;
    }
    const data = await response.json();

    if (!data.payload || !data.payload.data) {
      console.log("❌ No payload found in this block.");
      return null;
    }

    // Assume payload.data is a hex string that includes the IV (first 16 bytes) and the ciphertext.
    let payloadHex = data.payload.data;
    if (payloadHex.startsWith('0x')) {
      payloadHex = payloadHex.slice(2);
    }
    const payloadBytes = hexStringToBytes(payloadHex);
    if (payloadBytes.length < 16) {
      console.error("❌ Payload too short to contain IV and ciphertext.");
      return null;
    }
    // Extract effective IV (first 16 bytes) and the encrypted ciphertext (remaining bytes)
    const effectiveIV = payloadBytes.slice(0, 16);
    const encryptedBytes = payloadBytes.slice(16);

    // Generate the daily key using your crypto utils.
    const dailyKeyHex = await generateDailyKeySHA256(masterKeyHex, vehicleId, initDate, fetchDate);
    console.log("Generated Daily Key (hex):", dailyKeyHex);

    // Decrypt the ciphertext using AES-CTR with the generated daily key and effective IV.
    const decryptedBytes = await decryptWithAES(encryptedBytes, effectiveIV, dailyKeyHex);
    if (!decryptedBytes) {
      console.error("❌ Decryption failed.");
      return null;
    }
    // Convert decrypted bytes into a UTF-8 string.
    const decoder = new TextDecoder();
    const decryptedMessage = decoder.decode(decryptedBytes);

    // Decode the tag if provided.
    let tag = data.payload.tag || "";
    if (tag.startsWith('0x')) {
      tag = tag.slice(2);
    }
    const tagBytes = hexStringToBytes(tag);
    const decodedTag = decoder.decode(tagBytes);

    // Prepare the result object.
    const result = {
      blockId,
      tag: decodedTag,
      decryptedMessage,
      timestamp: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : "Unknown"
    };

    console.log("Decrypted Block Data:", result);
    return result;
  } catch (error) {
    console.error("❌ Error in fetchAndDecryptIotaBlock:", error);
    return null;
  }
};