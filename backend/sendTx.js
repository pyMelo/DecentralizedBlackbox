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
  "function receiveSensorBatch(uint256 timestamp, string hexData) external",
  "event SensorBatchReceived(uint256 dateKey, uint256 timestamp, string hexData)"
];

const sensorContract = new ethers.Contract(contractAddress, abi, wallet);

// ------------------ SUI Setup ------------------
const suiClient = new SuiClient({ url: "https://fullnode.devnet.sui.io:443" });
const suiPrivateKey = process.env.SUI_PRIVATE_KEY;
const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(suiPrivateKey, "hex"));

// Package ID and Move call target – ensure PACKAGE_ID is defined in your .env
const packageId = process.env.PACKAGE_ID;
const moveCallTarget = `${packageId}::SensorData::send_sensor_data`;


// ------------------ Blockchain Sender Functions ------------------
const sendToIOTAEVM = async (timestamp, processedDataHex) => {
  try {
    const tx = await sensorContract.receiveSensorBatch(timestamp, processedDataHex);
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
    const network = 1;
    const { payload, timestamp} = req.body; // Expect network selection from request
    if (!payload || !timestamp || !network) {
      return res.status(400).json({ error: "Missing payload, timestamp, or network selection" });
    }

    console.log("Received blockchain TX request with payload:", payload, "timestamp:", timestamp, "network:", network);

    const vehicleId = "vehicle-123";
    const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);
    
    let txResult = {};
    
    switch (network) {
      case 1: // IOTA EVM
        txResult.iotaEvmTxHash = await sendToIOTAEVM(unixTimestamp, payload);
        txResult.links = {
          iotaEvm: `https://explorer.evm.testnet.iotaledger.net/tx/${txResult.iotaEvmTxHash}`
        };
        break;
      
      case 2: // SUI
        txResult.suiDigest = await sendToSui(vehicleId, unixTimestamp, payload);
        txResult.links = {
          sui: `https://suiscan.xyz/devnet/tx/${txResult.suiDigest}?network=devnet`
        };
        break;

      case 3: // IOTA Data-Only
        txResult.iotaDataBlock = await sendToIOTADataOnly(vehicleId, payload);
        txResult.links = {
          iotaData: `https://explorer.iota.org/iota-testnet/block/${txResult.iotaDataBlock}`
        };
        break;

      default:
        return res.status(400).json({ error: "Invalid network selection. Choose 1, 2, or 3." });
    }

    res.json({
      message: `Sensor data sent successfully to selected network (${network})`,
      ...txResult
    });

  } catch (error) {
    console.error("Error in /sendTx:", error);
    res.status(500).json({ error: error.message });
  }
});


app.listen(port, () => {
  console.log(`Blockchain sender server listening on port ${port}`);
});
