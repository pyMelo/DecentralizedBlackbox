// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SensorDataBatch {
    // Struttura per memorizzare un batch di dati sensoriali
    struct SensorBatch {
        uint256 timestamp; // Timestamp completo della registrazione
        string hexData;    // Dati ricevuti in formato esadecimale
    }

    // Mapping: veicolo => (dataKey => array di batch)
    // Il "dataKey" è calcolato normalizzando il timestamp all'inizio del giorno.
    mapping(string => mapping(uint256 => SensorBatch[])) private batches;

    // Evento per registrare l'arrivo di nuovi dati
    event SensorBatchReceived(
        string vehicleId,
        uint256 dateKey,
        uint256 timestamp,
        string hexData
    );

    /**
     * @notice Registra un batch di dati sensoriali ricevuti in formato HEX.
     * @param vehicleId Identificativo del veicolo.
     * @param timestamp Il timestamp della registrazione (es. block.timestamp).
     * @param hexData Dati esadecimali ricevuti dal veicolo.
     */
    function receiveSensorBatch(
        string calldata vehicleId,
        uint256 timestamp,
        string calldata hexData
    ) external {
        // Se vuoi togliere il controllo sul formato esadecimale (lunghezza pari)
        // puoi commentare o rimuovere la seguente riga:
        // require(bytes(hexData).length % 2 == 0, "Hex string must have an even length");

        // Calcola il "date key" normalizzando il timestamp all'inizio del giorno (UTC)
        uint256 dateKey = timestamp - (timestamp % 1 days);

        // Crea il nuovo batch
        SensorBatch memory newBatch = SensorBatch({
            timestamp: timestamp,
            hexData: hexData
        });

        // Salva il batch
        batches[vehicleId][dateKey].push(newBatch);

        // Emetti l'evento
        emit SensorBatchReceived(vehicleId, dateKey, timestamp, hexData);
    }

    /**
     * @notice Recupera il numero di batch registrati per un veicolo in una determinata data.
     * @param vehicleId Identificativo del veicolo.
     * @param dateKey Il "date key" (timestamp dell'inizio della giornata).
     * @return Il numero di batch per quel giorno.
     */
    function getBatchCount(string calldata vehicleId, uint256 dateKey) external view returns (uint256) {
        return batches[vehicleId][dateKey].length;
    }

    /**
     * @notice Recupera un batch di dati per un veicolo in una determinata data.
     * @param vehicleId Identificativo del veicolo.
     * @param dateKey Il "date key" (inizio della giornata in timestamp).
     * @param index Indice del batch nell'array.
     * @return Il timestamp e i dati HEX.
     */
    function getSensorBatch(
        string calldata vehicleId,
        uint256 dateKey,
        uint256 index
    ) external view returns (uint256, string memory) {
        SensorBatch storage batch = batches[vehicleId][dateKey][index];
        return (batch.timestamp, batch.hexData);
    }

    /**
     * @notice Recupera tutti i batch di un veicolo per un determinato giorno.
     * @param vehicleId Identificativo del veicolo.
     * @param dateKey Il "date key" (inizio della giornata in timestamp).
     * @return Un array di tutti i batch registrati quel giorno.
     */
    function getAllSensorBatchesForDay(
        string calldata vehicleId,
        uint256 dateKey
    ) external view returns (SensorBatch[] memory) {
        return batches[vehicleId][dateKey];
    }
}
