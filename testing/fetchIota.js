// searchByPayloadTag.js
// For Node.js v18+ (fetch is global)

/**
 * Convert a hex string (without 0x) to a UTF-8 string.
 */
function hexToUtf8(hex) {
    try {
      return decodeURIComponent(
        hex.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&')
      );
    } catch (e) {
      console.error("Error decoding hex to UTF-8:", e);
      return hex;
    }
  }
  
  /**
   * Convert UTF-8 string to a hex string (without 0x).
   */
  function utf8ToHex(str) {
    return Array.from(str)
      .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * Fetch blocks with a specific tag from the IOTA Testnet API
   */
  async function searchBlocksByTag(tag, limit = 100) {
    try {
      // Convert tag to hex format for the query
      const hexTag = utf8ToHex(tag);
      console.log(`Searching for blocks with tag: ${tag} (hex: ${hexTag})`);
      
      // The correct endpoint for IOTA Testnet
      const url = `https://api.testnet.iotaledger.net/api/indexer/v1/blocks?tag=${hexTag}&limit=${limit}`;
      console.log(`Fetching from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Found ${data.items?.length || 0} blocks with matching tag`);
      
      // Process each block to get full details
      const detailedBlocks = [];
      if (data.items && data.items.length > 0) {
        for (const blockId of data.items) {
          try {
            const blockDetails = await fetchBlockDetails(blockId);
            detailedBlocks.push({
              blockId,
              blockData: blockDetails
            });
          } catch (error) {
            console.error(`Error fetching details for block ${blockId}:`, error);
          }
        }
      }
      
      return detailedBlocks;
    } catch (error) {
      console.error("Error searching for blocks by tag:", error);
      return [];
    }
  }
  
  /**
   * Fetch block details for a given block ID
   */
  async function fetchBlockDetails(blockId) {
    const url = `https://api.testnet.iotaledger.net/api/core/v2/blocks/${blockId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch block details for ${blockId}, status: ${response.status}`);
    }
    
    return await response.json();
  }
  
  /**
   * Extract and format meaningful data from block payload
   */
  function parseBlockPayload(blockData) {
    if (!blockData || !blockData.payload) {
      return { tag: "N/A", data: "No payload" };
    }
    
    let result = {};
    
    // Handle tagged data payload based on the explorer screenshot
    if (blockData.payload.type === 5) { // Tagged data payload on IOTA Testnet
      const taggedData = blockData.payload;
      result.tag = taggedData.tag ? hexToUtf8(taggedData.tag) : "N/A";
      result.data = taggedData.data ? hexToUtf8(taggedData.data) : "No data";
    } else if (blockData.payload.essence && blockData.payload.essence.payload) {
      // Transaction payload with tagged data
      const innerPayload = blockData.payload.essence.payload;
      result.tag = innerPayload.tag ? hexToUtf8(innerPayload.tag) : "N/A";
      result.data = innerPayload.data ? hexToUtf8(innerPayload.data) : "No data";
    } else {
      // Other payload types
      result.type = blockData.payload.type;
      result.data = "Complex payload structure (not tagged data)";
    }
    
    return result;
  }
  
  /**
   * Main function to demonstrate tag-based search
   */
  async function main() {
    // Replace with the tag you're interested in (e.g., "VEH-642" from the screenshot)
    const tagToSearch = "VEH-642";
    const results = await searchBlocksByTag(tagToSearch);
    
    console.log("\nMatching Blocks:");
    if (results.length === 0) {
      console.log("No blocks found with the specified tag.");
      console.log("Try these troubleshooting steps:");
      console.log("1. Make sure the tag is exact (case-sensitive)");
      console.log("2. Check if the indexer service is responding properly");
      console.log("3. Check if blocks with this tag exist within recent history");
    }
    
    results.forEach(({ blockId, blockData }) => {
      const payloadInfo = parseBlockPayload(blockData);
      
      console.log(`\nBlock ID: ${blockId}`);
      console.log(`Tag: ${payloadInfo.tag}`);
      console.log(`Data: ${payloadInfo.data}`);
      
      // Try to parse the data as JSON if applicable
      try {
        if (payloadInfo.data && payloadInfo.data.trim().startsWith('{')) {
          const jsonData = JSON.parse(payloadInfo.data);
          console.log("Parsed JSON data:");
          console.log(JSON.stringify(jsonData, null, 2));
        }
      } catch (e) {
        // Not JSON or invalid JSON, already showing as raw text
      }
      
      console.log(`Timestamp: ${blockData.timestamp ? new Date(blockData.timestamp * 1000).toISOString() : "Unknown"}`);
    });
  }
  
  // Execute the main function
  main().catch(console.error);