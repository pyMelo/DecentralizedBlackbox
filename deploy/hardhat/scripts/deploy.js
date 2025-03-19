const { ethers } = require("hardhat");

async function main() {
  // Get a different account each time by using a different index
  const [deployer] = await ethers.getSigners(); // Using second account
  console.log("Deploying contracts with the account:", deployer.address);

  const contractName = await ethers.getContractFactory("SensorData", deployer);
  const contract = await contractName.deploy();
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("DecBlackBox contract deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});