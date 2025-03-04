import express from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { spawn } from 'child_process';
import cors from 'cors';

dotenv.config({path: "../.env"});

const app = express();
const port = 3001;
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// ----- IOTAEVM Setup -----
const provider = new ethers.JsonRpcProvider("https://json-rpc.evm.testnet.iotaledger.net");
const wallet = new ethers.Wallet(
  process.env.ETH_PRIVATE_KEY,
  provider
);
const contractAddress = process.env.CONC_ADDR;
const abi = [
  "function receiveSensorBatch(string vehicleId, uint256 timestamp, string hexData) external",
  "event SensorBatchReceived(string vehicleId, uint256 dateKey, uint256 timestamp, bytes data)"
];
const sensorContract = new ethers.Contract(contractAddress, abi, wallet);

const client = new SuiClient({ url: "https://fullnode.devnet.sui.io:443" });
const suiPrivateKey = "7cd59cf6b3d002f41be14bd684d022234ddfe69696b6d5b5ed84e30c40df26c7";
const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(suiPrivateKey, "hex"));


// Package ID from your comment
const packageId = "0x40b03a280003d60b9a6f4b184c4c6066c940ab6a4830e9e97f6394aceaf5a095";
const moveCallTarget = `${packageId}::SensorData::send_sensor_data`;


// ----- Helper Functions for Bit/Hex Conversion -----
function hexToBits(hexString) {
  return hexString.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
}

function bitsToHex(bitStr) {
  let hex = "";
  for (let i = 0; i < bitStr.length; i += 4) {
    hex += parseInt(bitStr.substr(i, 4), 2).toString(16);
  }
  return hex;
}

function bitsToBuffer(bitStr) {
  const bytes = bitStr.match(/.{1,8}/g).map(b => parseInt(b, 2));
  return Buffer.from(bytes);
}

function getCurrentDayString() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ----- Master Key / Daily Key Logic for Encryption -----
const MASTER_KEY = process.env.MASTER_KEY || "5b5425e6c3abdd369f3ef230dfc485e3a3e35386d68ad3c76c6d3225e471624d";
const masterKeyBuffer = Buffer.from(MASTER_KEY, 'hex');

function generateDailyKey(dayStr) {
  const dayBuffer = Buffer.from(dayStr, 'utf8');
  return crypto.createHash('sha256').update(Buffer.concat([masterKeyBuffer, dayBuffer])).digest();
}

// ----- Process Sensor Data -----
function processSensorData(dataHex) {
  if (dataHex.startsWith("0x")) dataHex = dataHex.slice(2);
  const originalBitStr = hexToBits(dataHex);
  if (originalBitStr.length % 40 !== 0) throw new Error("Invalid data length");
  const numBlocks = originalBitStr.length / 40;
  let processedBitStr = "";
  const dayStr = getCurrentDayString();
  const dailyKey = generateDailyKey(dayStr);
  const iv = Buffer.alloc(16, 0);
  let encryptionCount = 0;
  
  for (let i = 0; i < numBlocks; i++) {
    let block = originalBitStr.substr(i * 40, 40);
    if (block[0] === '1') {
      encryptionCount++;
      const clearPayloadBits = block.substring(1);
      const paddedPayloadBits = clearPayloadBits + "0";
      const payloadBuffer = bitsToBuffer(paddedPayloadBits);
      const cipher = crypto.createCipheriv('aes-256-ctr', dailyKey, iv);
      const encryptedBuffer = Buffer.concat([cipher.update(payloadBuffer), cipher.final()]);
      let encryptedBits = "";
      for (const byte of encryptedBuffer) {
        encryptedBits += byte.toString(2).padStart(8, '0');
      }
      const encryptedPayloadBits = encryptedBits.substr(0, 39);
      console.log(`Block ${i + 1} encrypted. Clear: ${clearPayloadBits} | Encrypted: ${encryptedPayloadBits}`);
      block = '1' + encryptedPayloadBits;
    }
    processedBitStr += block;
  }
  console.log(`Original bits: ${originalBitStr}`);
  console.log(`Processed bits: ${processedBitStr}`);
  console.log(`Total encryptions: ${encryptionCount}`);
  return bitsToHex(processedBitStr);
}

// ----- SENDER FUNCTIONS -----
// IOTAEVM: send to the EVM sensor contract
const sendToIOTAEVM = async (vehicleId, timestamp, processedDataHex) => {
  try {
    const tx = await sensorContract.receiveSensorBatch(vehicleId, timestamp, processedDataHex);
    console.log(`✅ IOTAEVM TX: https://explorer.evm.testnet.iotaledger.net/tx/${tx.hash}`);
    await tx.wait();
    console.log("IOTAEVM Tx confirmed!");
    return tx.hash;
  } catch (error) {
    console.error('Error sending data to IOTAEVM', error);
    return null;
  }
};

// SUI: send data using a Move call
const sendToSui = async (vehicleId, timestamp, processedDataHex) => {
  try {

    
      // Create a new TransactionBlock (not Transaction)
      const tx = new Transaction();
      tx.setSender(keypair.getPublicKey().toSuiAddress());
      tx.setGasPrice(1000);
      tx.setGasBudget(10_000_000);
      
      
      // Add the move call
      tx.moveCall({
        target: moveCallTarget,
        arguments: [
          tx.pure.string(vehicleId),
          tx.pure.u64(timestamp),
          tx.pure.string(processedDataHex)
        ],
      });

      const builtTx = await tx.build({ client });
      const { bytes: txBytes, signature: txSignature } = await keypair.signTransaction(builtTx);
      const result = await client.executeTransactionBlock({ transactionBlock: txBytes, signature: txSignature });
      console.log(`✅ Sui TX: https://suiscan.xyz/devnet/tx/${result.digest}?network=devnet`);
    return result.digest;
  } catch (error) {
    console.error('Error sending data to Sui:', error);
    return null;
  }
};

// IOTA Data-only: use a Python script (feeless)
const sendToIOTADataOnly = async (vehicleId, processedDataHex) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['python/send_iota.py', vehicleId, processedDataHex]);
    let result = '';
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error('Error in Python script:', data.toString());
    });
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ IOTA Block: https://explorer.iota.org/iota-testnet/block/${result.trim()}`);
        resolve(result.trim());
      } else {
        reject(new Error('Error executing Python script'));
      }
    });
  });
};


// ----- Express Endpoint -----
app.post('/send', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "Missing 'data'" });
    console.log("Data received:", req.body);
    const processedDataHex = processSensorData(data);
    console.log("Processed hex:", processedDataHex);
    const vehicleId = "vehicle-123";
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Send to each platform
    const iotaEvmTxHash = await sendToIOTAEVM(vehicleId, timestamp, processedDataHex);
    const suiDigest = await sendToSui(vehicleId, timestamp, processedDataHex);
    const iotaDataBlock = await sendToIOTADataOnly(vehicleId, processedDataHex);
    
    res.json({
      message: "Sensor data sent successfully to all chains",
      iotaEvmTxHash,
      suiDigest,
      iotaDataBlock,
      links: {
        iotaEvm: `https://explorer.evm.testnet.iotaledger.net/tx/${iotaEvmTxHash}`,
        sui: `https://suiscan.xyz/devnet/tx/${suiDigest}?network=devnet`,
        iotaData: `https://explorer.iota.org/iota-testnet/block/${iotaDataBlock}`
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log("MASTER_KEY (hex):", MASTER_KEY.toString('hex'));
});
