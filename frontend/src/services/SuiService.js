import { SuiClient } from '@mysten/sui/client';

//import dotenv from 'dotenv';

//dotenv.config({path:"../.env"})

// Connect to Sui Devnet (change URL for mainnet if needed)
const client = new SuiClient({ url: 'https://fullnode.devnet.sui.io:443' });

// Package ID and function name for your SensorData Move module
const PACKAGE_ID = "0xfc784c5c8e522b23c41d4439f83117f76bc3c1b82ce3fe79e9d8df09f1a3817c";
const FUNCTION_NAME = "send_sensor_data";

/**
 * Fetch full transaction details for a given transaction digest.
 * @param {string} txDigest - The transaction digest.
 * @returns {object|null} The transaction details, or null if an error occurs.
 */
async function fetchTransactionDetails(txDigest) {
  try {
    const txData = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });
    return txData;
  } catch (error) {
    console.error(`Error fetching details for ${txDigest}:`, error);
    return null;
  }
}

/**
 * Extract sensor data from an array of inputs.
 * Expected structure:
 *   inputs[0] → { value: vehicleId }  
 *   inputs[1] → { value: timestamp }  
 *   inputs[2] → { value: hexData }
 *
 * @param {Array} inputs - The inputs array from a transaction.
 * @returns {object|null} An object with sensor data or null if not as expected.
 */
function extractSensorData(inputs) {
  if (Array.isArray(inputs) && inputs.length >= 3) {
    return {
      vehicleId: inputs[0]?.value || "N/A",
      timestamp: inputs[1]?.value || "N/A",
      hexData: inputs[2]?.value || "N/A",
    };
  }
  return null;
}

/**
 * Query recent transaction blocks for the package, filter those that call the
 * function send_sensor_data, fetch full details for each, and extract sensor data.
 *
 * @returns {Array} An array of sensor data records.
 */
export async function fetchSensorDataInputs() {
  try {
    console.log(`Querying transactions for package ${PACKAGE_ID}...`);
    const txResponse = await client.queryTransactionBlocks({
      filter: { InputObject: PACKAGE_ID },
      limit: 50,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
      },
    });

    const txs = txResponse.data || [];
    console.log(`Found ${txs.length} transactions for the package.`);
    if (txs.length === 0) {
      return [];
    }

    // Filter transactions that include a MoveCall to send_sensor_data.
    const sensorTxs = [];
    for (const tx of txs) {
      const calls = tx.transaction?.data?.transaction?.transactions || [];
      const sensorCalls = calls.filter(call =>
        call.MoveCall &&
        call.MoveCall.package === PACKAGE_ID &&
        call.MoveCall.function === FUNCTION_NAME
      );
      if (sensorCalls.length > 0) {
        sensorTxs.push({ digest: tx.digest, timestampMs: tx.timestampMs });
      }
    }
    console.log(`Found ${sensorTxs.length} transactions calling "${FUNCTION_NAME}".`);

    const sensorDataRecords = [];
    for (const tx of sensorTxs) {
      console.log(`\nTransaction Digest: ${tx.digest}`);
      console.log(`Timestamp: ${new Date(parseInt(tx.timestampMs)).toLocaleString()}`);
      
      const details = await fetchTransactionDetails(tx.digest);
      if (!details) {
        console.log("  Could not fetch transaction details.");
        continue;
      }
      
      // Sensor data is stored in the inputs array
      const inputs = details.transaction?.data?.transaction?.inputs || [];
      // (Optional) Log the raw inputs to inspect their structure:
      // console.log("Raw inputs:", JSON.stringify(inputs, null, 2));
      
      const sensorData = extractSensorData(inputs);
      if (sensorData) {
        console.log("  Extracted Sensor Data:");
        console.log(`    Vehicle ID: ${sensorData.vehicleId}`);
        console.log(`    Timestamp:  ${sensorData.timestamp}`);
        console.log(`    Hex Data:   ${sensorData.hexData}`);
        sensorDataRecords.push({
          txDigest: tx.digest,
          ...sensorData,
          timestampMs: tx.timestampMs,
        });
      } else {
        console.log("  Sensor data not found in expected structure.");
      }
    }
    
    console.log(`\nTotal sensor data records retrieved: ${sensorDataRecords.length}`);
    return sensorDataRecords;
  } catch (error) {
    console.error("Error fetching sensor data inputs:", error);
    return [];
  }
}
