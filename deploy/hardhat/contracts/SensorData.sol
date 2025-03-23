// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SensorData {
    struct SensorBatch {
        uint256 timestamp; // Complete timestamp of the recording
        string hexData;    // Data received in hexadecimal format
    }

    // Mapping: dateKey => array of batches
    mapping(uint256 => SensorBatch[]) private batches;

    event SensorBatchReceived(
        uint256 indexed dateKey,
        uint256 timestamp,
        string hexData
    );

    /**
     * @notice Stores a batch of sensor data in HEX format.
     * @param timestamp The timestamp of the recording (e.g., block.timestamp).
     * @param hexData Hexadecimal data received from the sensor.
     */
    function receiveSensorBatch(
        uint256 timestamp,
        string calldata hexData
    ) external {
        uint256 dateKey = timestamp - (timestamp % 1 days); // Normalize timestamp to start of the day

        SensorBatch memory newBatch = SensorBatch({
            timestamp: timestamp,
            hexData: hexData
        });

        batches[dateKey].push(newBatch);

        emit SensorBatchReceived(dateKey, timestamp, hexData);
    }
    function getAllSensorBatchesForDay(
        uint256 dateKey
    ) external view returns (SensorBatch[] memory) {
        return batches[dateKey];
    }
}
