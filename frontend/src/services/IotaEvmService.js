import { ethers } from 'ethers';
import { decodePayload, translateBlocks } from '../lib/payload';

// Set up the provider and contract
const provider = new ethers.JsonRpcProvider("https://json-rpc.evm.testnet.iotaledger.net");
const contractAddress = "0x34B3b0a10B0aC0B0d021bDb0d164608701586eF9";
const abi = [
  "function getAllSensorBatchesForDay(string vehicleId, uint256 dateKey) external view returns (tuple(uint256 timestamp, string hexData)[])"
];

const contract = new ethers.Contract(contractAddress, abi, provider);

/**
 * Fetch sensor data batches for a given vehicleId and dateKey.
 * Each batch's hex payload is decoded and translated.
 *
 * @param {string} vehicleId - The vehicle ID to fetch data for.
 * @param {number} dateKey - Unix timestamp (start of day) for the desired date.
 * @returns {Array} Array of decoded sensor data batches.
 */
export async function fetchSensorData(vehicleId, dateKey) {
  try {
    const result = await contract.getAllSensorBatchesForDay(vehicleId, dateKey);
    // For each batch, decode the payload and translate each block.
    const decoded = result.map(batch => {
      const blocks = decodePayload(batch.hexData);
      const translated = translateBlocks(blocks);
      return {
        timestamp: batch.timestamp.toString(),
        hexData: batch.hexData,
        blocks,
        translated,
      };
    });
    return decoded;
  } catch (error) {
    console.error("Error in fetchSensorData:", error);
    throw error;
  }
}
