// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DataStorage
 * @dev Stores sensor data as a JSON string on-chain.
 */
contract DataStorage {
    /// @notice Event that logs JSON data for readability
    event DataStored(string jsonData);

    /**
     * @notice Stores sensor data as a JSON string
     * @param jsonData The JSON string containing sensor readings
     */
    function storeData(string memory jsonData) external {
        emit DataStored(jsonData);
    }
}
