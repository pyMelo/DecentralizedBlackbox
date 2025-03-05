// blockchainSender.js
import express from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { spawn } from 'child_process';
import cors from 'cors';

dotenv.config({ path: "../.env" });

const app = express();
const port = 3001;
app.use(express.json());
app.use(cors());

// ------------------ IOTAEVM Setup ------------------
const provider = new ethers.JsonRpcProvider("https://json-rpc.evm.testnet.iotaledger.net");
const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);
const contractAddress = process.env.CONC_ADDR;
const abi = [
  "function receiveSensorBatch(string vehicleId, uint256 timestamp, string hexData) external",
  "event SensorBatchReceived(string vehicleId, uint256 dateKey, uint256 timestamp, bytes data)"
];
const sensorContract = new ethers.Contract(contractAddress, abi, wallet);

// ------------------ SUI Setup ------------------
const suiClient = new SuiClient({ url: "https://fullnode.devnet.sui.io:443" });
const suiPrivateKey = process.env.SUI_PRIVATE_KEY;
const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(suiPrivateKey, "hex"));

// Package ID and Move call target – ensure PACKAGE_ID is defined in your .env
const packageId = process.env.PACKAGE_ID;
const moveCallTarget = `${packageId}::SensorData::send_sensor_data`;

// ------------------ Helper Functions ------------------
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

const MASTER_KEY = "5b5425e6c3abdd369f3ef230dfc485e3a3e35386d68ad3c76c6d3225e471624d";
const masterKeyBuffer = Buffer.from(MASTER_KEY, 'hex');
function generateDailyKey(dayStr) {
  const dayBuffer = Buffer.from(dayStr, 'utf8');
  return crypto.createHash('sha256').update(Buffer.concat([masterKeyBuffer, dayBuffer])).digest();
}
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

// ------------------ Blockchain Sender Functions ------------------
const sendToIOTAEVM = async (vehicleId, timestamp, processedDataHex) => {
  try {
    const tx = await sensorContract.receiveSensorBatch(vehicleId, timestamp, processedDataHex);
    console.log(`IOTAEVM TX: https://explorer.evm.testnet.iotaledger.net/tx/${tx.hash}`);
    await tx.wait();
    console.log("IOTAEVM Tx confirmed!");
    return tx.hash;
  } catch (error) {
    console.error('Error sending data to IOTAEVM', error);
    return null;
  }
};

const sendToSui = async (vehicleId, timestamp, processedDataHex) => {
  try {
    const tx = new Transaction();
    tx.setSender(keypair.getPublicKey().toSuiAddress());
    tx.setGasPrice(1000);
    tx.setGasBudget(10_000_000);
    
    tx.moveCall({
      target: moveCallTarget,
      arguments: [
        tx.pure.string(vehicleId),
        tx.pure.u64(timestamp),
        tx.pure.string(processedDataHex)
      ],
    });
    
    const builtTx = await tx.build({ client: suiClient });
    const { bytes: txBytes, signature: txSignature } = await keypair.signTransaction(builtTx);
    const result = await suiClient.executeTransactionBlock({ transactionBlock: txBytes, signature: txSignature });
    console.log(`Sui TX: https://suiscan.xyz/devnet/tx/${result.digest}?network=devnet`);
    return result.digest;
  } catch (error) {
    console.error('Error sending data to Sui:', error);
    return null;
  }
};

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
        console.log(`IOTA Block: https://explorer.iota.org/iota-testnet/block/${result.trim()}`);
        resolve(result.trim());
      } else {
        reject(new Error('Error executing Python script'));
      }
    });
  });
};

// ------------------ Express Endpoint ------------------
app.post('/sendTx', async (req, res) => {
  try {
    const { payload, timestamp } = req.body;
    if (!payload || !timestamp) {
      return res.status(400).json({ error: "Missing payload or timestamp" });
    }
    
    console.log("Received blockchain TX request with payload:", payload, "and timestamp:", timestamp);
    
    const vehicleId = "vehicle-123";
    const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);
    
    const iotaEvmTxHash = await sendToIOTAEVM(vehicleId, unixTimestamp, payload);
    const suiDigest = await sendToSui(vehicleId, unixTimestamp, payload);
    const iotaDataBlock = await sendToIOTADataOnly(vehicleId, payload);
    
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
    console.error("Error in /sendTx:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Blockchain sender server listening on port ${port}`);
});
