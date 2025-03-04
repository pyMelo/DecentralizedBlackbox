// src/services/iotaDataOnlyService.js

/**
 * Convert a hex string (without 0x) to a UTF-8 string.
 */
export const hexToUtf8 = (hex) => {
  try {
    return decodeURIComponent(
      hex.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&')
    );
  } catch (e) {
    console.error("❌ Error decoding hex to UTF-8:", e);
    return hex;
  }
};

/**
 * Fetch an IOTA Data‑Only block by constructing an index from a date and a custom ID.
 * The index is in the form: "DATA|YYYY-MM-DD|<id>", which is then converted to hex.
 * This hex index is used to search for messages, and the first found message is used
 * to fetch the block details.
 *
 * @param {string} date - The date in "YYYY-MM-DD" format.
 * @param {string} id - The custom ID (e.g., vehicle id).
 * @returns {object|null} An object containing block details, or null if not found.
 */
export const fetchIotaDataOnlyTransactionByDateAndId = async (date, id) => {
  try {
    // Build the index string and convert it to hex
    const indexString = `DATA|${date}|${id}`;
    const indexHex = Buffer.from(indexString, 'utf8').toString('hex');
    console.log(`🔍 Searching for IOTA Data‑Only block with index: ${indexString} -> ${indexHex}`);

    // Query IOTA API for message IDs using the index.
    const searchResponse = await fetch(`https://api.testnet.iotaledger.net/api/core/v2/messages?index=${indexHex}`);
    if (!searchResponse.ok) {
      console.error("❌ Error searching for IOTA messages.");
      return null;
    }
    const searchData = await searchResponse.json();
    if (!searchData.messageIds || searchData.messageIds.length === 0) {
      console.log("❌ No message IDs found for this index.");
      return null;
    }

    // Use the first message ID found.
    const messageId = searchData.messageIds[0];
    console.log(`Found message ID: ${messageId}`);

    // Fetch the block details using the message ID.
    const blockResponse = await fetch(`https://api.testnet.iotaledger.net/api/core/v2/blocks/${messageId}`);
    if (!blockResponse.ok) {
      console.error("❌ Error fetching IOTA block details.");
      return null;
    }
    const blockData = await blockResponse.json();
    if (!blockData.payload) {
      console.log("❌ No payload found in this block.");
      return null;
    }

    // Return the block details, decoding tag and message from hex.
    return {
      blockId: messageId,
      tag: blockData.payload.tag ? hexToUtf8(blockData.payload.tag) : "N/A",
      message: blockData.payload.data ? hexToUtf8(blockData.payload.data) : "No data",
      timestamp: blockData.timestamp ? new Date(blockData.timestamp * 1000).toISOString() : "Unknown",
    };
  } catch (error) {
    console.error("❌ Error fetching IOTA Data‑Only block by date and ID:", error);
    return null;
  }
};
