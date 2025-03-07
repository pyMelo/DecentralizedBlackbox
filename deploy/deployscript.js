import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import dotenv from "dotenv";
import { getFaucetHost, requestIotaFromFaucetV0 } from "@iota/iota-sdk/faucet";

dotenv.config(); // Load existing environment variables

const execAsync = promisify(exec);

// Replace with your IOTA address or set process.env.IOTA_ADDRESS
const IOTA_ADDRESS = process.env.IOTA_ADDRESS || "<YOUR IOTA ADDRESS>";

// Set the correct working directories
const HARDHAT_DIR = "./hardhat";      // Hardhat project directory
const SENSOR_DATA_DIR = "./SensorData"; // SUI Move contract directory
const ENV_FILES = ["../frontend/src/.env", "../.env"]; // Paths to update

// Function to update the .env file
async function updateEnvFile(key, value) {
  for (const envPath of ENV_FILES) {
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf-8");
      const regex = new RegExp(`^${key}=.*$`, "m");

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log(`✅ Updated ${key} in ${envPath}`);
    } else {
      console.warn(`⚠️ Warning: ${envPath} not found.`);
    }
  }
}

async function deployIota() {
  console.log("🚀 Starting IOTA deploy (Hardhat)...");
  try {
    const { stdout, stderr } = await execAsync(
      "npx hardhat run scripts/deploy.js --network IotaTestnet",
      { cwd: HARDHAT_DIR }
    );

    if (stderr) console.error("Hardhat deploy stderr:", stderr);
    console.log("Hardhat deploy stdout:\n", stdout);

    // Extract contract address
    const match = stdout.match(/deployed to: (0x[a-fA-F0-9]+)/);
    if (match) {
      const contractAddress = match[1];
      console.log(`✅ IOTA Contract Address: ${contractAddress}`);
      await updateEnvFile("CONC_ADDR", contractAddress);
      return true;
    } else {
      console.error("❌ IOTA contract address not found in output.");
      return false;
    }
  } catch (error) {
    console.error("❌ Error during IOTA deploy:", error.message);
    return false;
  }
}

async function runIotaFaucet() {
  console.log("💧 Requesting IOTA tokens from the faucet...");
  try {
    await requestIotaFromFaucetV0({
      host: getFaucetHost("devnet"),
      recipient: IOTA_ADDRESS,
    });
    console.log("✅ IOTA faucet request successful.");
  } catch (error) {
    console.error("❌ IOTA faucet request failed:", error);
  }
}

async function deploySui() {
  console.log("🚀 Starting SUI deploy (CLI publish)...");
  try {
    const { stdout, stderr } = await execAsync(
      "sui client publish --gas-budget 10000000",
      { cwd: SENSOR_DATA_DIR }
    );

    if (stderr) console.error("SUI deploy stderr:", stderr);
    console.log("SUI deploy stdout:\n", stdout);

    // Extract Package ID from stdout
    const match = stdout.match(/PackageID:\s(0x[a-fA-F0-9]+)/);
    if (match) {
      const packageID = match[1];
      console.log(`✅ SUI Package ID: ${packageID}`);
      await updateEnvFile("PACKAGE_ID", packageID);
      return true;
    } else {
      console.error("❌ SUI Package ID not found in output.");
      return false;
    }
  } catch (error) {
    console.error("❌ Error during SUI deploy:", error.message);
    return false;
  }
}

async function runSuiFaucet() {
  console.log("💧 Requesting SUI tokens from the faucet (CLI)...");
  try {
    const { stdout, stderr } = await execAsync("sui client faucet", {
      cwd: SENSOR_DATA_DIR,
    });

    if (stderr) console.error("SUI faucet stderr:", stderr);
    console.log("SUI faucet stdout:\n", stdout);
  } catch (error) {
    console.error("❌ Error during SUI faucet:", error.message);
  }
}

async function main() {
  // IOTA Deployment
  const iotaSuccess = await deployIota();
  if (!iotaSuccess) {
    console.log("IOTA deploy failed. Requesting faucet tokens...");
    await runIotaFaucet();
    console.log("Retrying IOTA deploy...");
    const retryIota = await deployIota();
    if (!retryIota) {
      console.error("❌ IOTA deploy still failed after faucet request.");
    } else {
      console.log("✅ IOTA deploy successful on retry.");
    }
  } else {
    console.log("✅ IOTA deploy successful.");
  }

  // SUI Deployment
  const suiSuccess = await deploySui();
  if (!suiSuccess) {
    console.log("SUI deploy failed. Requesting SUI faucet tokens...");
    await runSuiFaucet();
    console.log("Retrying SUI deploy...");
    const retrySui = await deploySui();
    if (!retrySui) {
      console.error("❌ SUI deploy still failed after faucet request.");
    } else {
      console.log("✅ SUI deploy successful on retry.");
    }
  } else {
    console.log("✅ SUI deploy successful.");
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
});
