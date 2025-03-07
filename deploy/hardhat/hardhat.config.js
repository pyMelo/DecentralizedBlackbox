// Load environment variables from .env file
require("@nomicfoundation/hardhat-toolbox");
const dotenv = require('dotenv');

dotenv.config({path:".env"})


module.exports = {
  solidity: "0.8.18", // Specify the Solidity version
  networks: {
    IotaTestnet: {
      url: "https://json-rpc.evm.testnet.iotaledger.net",
      accounts: [process.env.ETH_PRIVATE_KEY]    },
  },
  paths: {
    sources: "./contracts", // Replace with your contracts directory path
  },
};  


