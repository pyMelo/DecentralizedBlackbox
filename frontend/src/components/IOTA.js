// src/components/IOTA.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  IconButton
} from '@mui/material';
import { Contract, JsonRpcProvider } from 'ethers';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

//
// ----- UTILITIES -----
//

const getEpochUTC = (dateStr) => {
  const utcString = `${dateStr}T00:00:00Z`;
  return Math.floor(new Date(utcString).getTime() / 1000);
};

const hexStringToBytes = (hexString) => {
  const clean = hexString.replace(/\s+/g, '');
  const length = clean.length / 2;
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return result;
};

const asciiToBytes = (str) => new TextEncoder().encode(str);

const concatUint8Arrays = (...arrays) => {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((arr) => {
    result.set(arr, offset);
    offset += arr.length;
  });
  return result;
};

const sha256 = async (data) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
};

const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const epochToBytesBE = (epoch) => {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = epoch % 256;
    epoch = Math.floor(epoch / 256);
  }
  return bytes;
};

//
// ----- DAILY KEY GENERATION -----
//

const generateDailyKeySHA256 = async (
  masterKeyHex,
  vehicleId,
  initDate,
  fetchDate
) => {
  masterKeyHex = masterKeyHex.trim().toLowerCase();
  vehicleId = vehicleId.trim();

  const initEpoch = getEpochUTC(initDate);
  const fetchEpoch = getEpochUTC(fetchDate);
  const diffDays = Math.max(0, Math.floor((fetchEpoch - initEpoch) / 86400));

  const masterKeyBytes = hexStringToBytes(masterKeyHex);
  const vehicleIdBytes = asciiToBytes(vehicleId);
  const initEpochBytes = epochToBytesBE(initEpoch);

  let data = concatUint8Arrays(masterKeyBytes, vehicleIdBytes, initEpochBytes);
  let hash = await sha256(data);
  let dailyKey = hash.slice(0, 16);

  for (let i = 0; i < diffDays; i++) {
    const nextEpoch = initEpoch + (i + 1) * 86400;
    const nextEpochBytes = epochToBytesBE(nextEpoch);
    const iterationData = concatUint8Arrays(
      dailyKey,
      vehicleIdBytes,
      nextEpochBytes
    );
    const iterationHash = await sha256(iterationData);
    dailyKey = iterationHash.slice(0, 16);
  }
  return bytesToHex(dailyKey);
};

//
// ----- PAYLOAD DECODING -----
//

const decryptEncryptedBlock = async (encryptedBytes, effectiveIV, dailyKeyHex) => {
  const keyBuffer = hexStringToBytes(dailyKeyHex);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-CTR' },
    false,
    ['decrypt']
  );
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter: effectiveIV, length: 128 },
    cryptoKey,
    encryptedBytes
  );
  return new Uint8Array(decryptedBuffer);
};

const decodePayload = async (hex, dailyKeyHex, isClear = false) => {
  const cleanHex = hex.replace(/\s+/g, '');
  const bytes = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }

  // Decodifica del blocco in chiaro
  const effectiveIV = new Uint8Array(bytes.slice(0, 16));
  const clearBlockLength = bytes[16]; // atteso 6
  const sensorMarker = bytes[17];     // atteso 0x01
  const temperature = bytes[18];
  const gyroMarker = bytes[19];       // atteso 0x03

  // Giroscopio
  const gyroRawX = bytes[20];
  const gyroRawY = bytes[21];
  const gyroRawZ = bytes[22];
  const toSigned8Bit = (byte) => (byte > 127 ? byte - 256 : byte);
  const gx = toSigned8Bit(gyroRawX) / 100;
  const gy = toSigned8Bit(gyroRawY) / 100;
  const gz = toSigned8Bit(gyroRawZ) / 100;

  // Decodifica del blocco cifrato
  const encryptedBlockLength = bytes[23]; // atteso 5
  const encryptedData = new Uint8Array(bytes.slice(24, 24 + encryptedBlockLength));
  let decryptedData = null;

  if (!isClear) {
    const decryptedRaw = await decryptEncryptedBlock(encryptedData, effectiveIV, dailyKeyHex);
    // Struttura attesa per i dati cifrati:
    // Byte[0]: lunghezza (5)
    // Byte[1]: marker accelerometro (0x04)
    // Byte[2]: valore accelerometro (uint8_t)
    // Byte[3]: marker GPS (0x05)
    // Byte[4]: latitudine
    // Byte[5]: longitudine
    decryptedData = {
      acceleration: decryptedRaw[1],
      latitude: decryptedRaw[3],
      longitude: decryptedRaw[4]
    };
    console.log("Decrypted payload:", decryptedData);
  }

  return {
    clearBlock: {
      clearBlockLength,
      sensorMarker,
      temperature,
      gyroMarker,
      gx,
      gy,
      gz
    },
    encryptedBlock: {
      encryptedBlockLength,
      encryptedData,
      decryptedData
    },
    computedTimestamp: 0,
    effectiveIV
  };
};

//
// ----- COMPONENTE REACT -----
//

const IOTA = () => {
  const [mode, setMode] = useState("clear");
  const [masterKey, setMasterKey] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Carica automaticamente Vehicle ID e Data di Inizializzazione dal profilo (localStorage)
  const [vehicleId, setVehicleId] = useState('');
  const [initDate, setInitDate] = useState('');
  useEffect(() => {
    const savedVehicleId = localStorage.getItem('vehicleId');
    const savedInitDate = localStorage.getItem('initDate');
    if (savedVehicleId && savedInitDate) {
      setVehicleId(savedVehicleId);
      setInitDate(savedInitDate);
    }
  }, []);

  const getDateKey = (dateStr) => getEpochUTC(dateStr);

  // Fetch per dati in chiaro (senza decriptazione)
  const handleFetchClearData = async () => {
    if (!contractAddress) {
      setError("Compila l'indirizzo contratto.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const dateKey = getDateKey(selectedDate);
      const provider = new JsonRpcProvider('https://json-rpc.evm.testnet.iotaledger.net');
      const abi = [
        'function getAllSensorBatchesForDay(uint256 dateKey) external view returns (tuple(uint256 timestamp, string hexData)[])'
      ];
      const contract = new Contract(contractAddress, abi, provider);
      const result = await contract.getAllSensorBatchesForDay(dateKey);

      if (result.length > 0) {
        const decodedPayloads = await Promise.all(
          result.map(async (batch) => {
            const decoded = await decodePayload(batch.hexData, '', true);
            return {
              ...decoded,
              computedTimestamp: parseInt(batch.timestamp)
            };
          })
        );
        setData(decodedPayloads);
      } else {
        setData([]);
      }
      setMode('clear');
    } catch (err) {
      console.error(err);
      setError('Errore nel recupero dei dati.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch per dati decriptati
  const handleFetchData = async () => {
    // Verifica che tutti i campi necessari siano compilati:
    // contractAddress, selectedDate, masterKey, vehicleId e initDate.
    if (!contractAddress || !selectedDate || !masterKey || !vehicleId || !initDate) {
      setError("Compila tutti i campi necessari per i dati nascosti.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const dailyKeyHex = await generateDailyKeySHA256(masterKey, vehicleId, initDate, selectedDate);
      console.log("Daily Key:", dailyKeyHex);

      const dateKey = getDateKey(selectedDate);
      const provider = new JsonRpcProvider('https://json-rpc.evm.testnet.iotaledger.net');
      const abi = [
        'function getAllSensorBatchesForDay(uint256 dateKey) external view returns (tuple(uint256 timestamp, string hexData)[])'
      ];
      const contract = new Contract(contractAddress, abi, provider);
      const result = await contract.getAllSensorBatchesForDay(dateKey);

      if (result.length > 0) {
        const decodedPayloads = await Promise.all(
          result.map(async (batch) => {
            const decoded = await decodePayload(batch.hexData, dailyKeyHex, false);
            return {
              ...decoded,
              computedTimestamp: parseInt(batch.timestamp)
            };
          })
        );
        setData(decodedPayloads);
        setMode('decrypted');
      } else {
        setData([]);
        setError('Nessuna transazione trovata per il giorno selezionato.');
      }
    } catch (err) {
      console.error(err);
      setError('Errore nel recupero dei dati.');
    } finally {
      setLoading(false);
    }
  };

  // Dati per i grafici in chiaro
  const clearChartData = data.map((item) => ({
    time: new Date(item.computedTimestamp * 1000).toLocaleTimeString(),
    value: item.clearBlock.temperature
  }));
  const gyroChartData = data.map((item) => ({
    time: new Date(item.computedTimestamp * 1000).toLocaleTimeString(),
    gx: item.clearBlock.gx,
    gy: item.clearBlock.gy,
    gz: item.clearBlock.gz
  }));

  // Dati per i grafici decriptati
  const hiddenChartData = data.map((item) => ({
    time: new Date(item.computedTimestamp * 1000).toLocaleTimeString(),
    value: item.encryptedBlock.decryptedData
      ? item.encryptedBlock.decryptedData.acceleration
      : 0
  }));
  const gpsChartData = data.map((item) => ({
    time: new Date(item.computedTimestamp * 1000).toLocaleTimeString(),
    latitude: item.encryptedBlock.decryptedData
      ? item.encryptedBlock.decryptedData.latitude
      : 0,
    longitude: item.encryptedBlock.decryptedData
      ? item.encryptedBlock.decryptedData.longitude
      : 0
  }));

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        overflowX: 'hidden',
        background: '#fff',
        fontFamily: "'Montserrat', sans-serif",
        color: '#000'
      }}
    >
      {/* Header e form di input */}
      <Box sx={{ p: 2, borderBottom: '1px solid #ccc' }}>
        <Typography variant="h3" align="center" gutterBottom>
          Interfaccia IOTA
        </Typography>
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Indirizzo Contratto"
            placeholder="Inserisci indirizzo contratto"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
          />
        </Box>
        {contractAddress && (
          <Box
            sx={{
              maxWidth: 600,
              mx: 'auto',
              mt: 2,
              display: 'flex',
              gap: 2
            }}
          >
            <Button
              variant="contained"
              fullWidth
              onClick={handleFetchClearData}
              disabled={loading}
            >
              Mostra Dati
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleFetchData}
              disabled={!selectedDate || !masterKey || !vehicleId || !initDate || loading}
            >
              Mostra Nascosti
            </Button>
          </Box>
        )}
        <Box
          sx={{
            maxWidth: 600,
            mx: 'auto',
            mt: 2,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            label="Data di Fetch (Payload)"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <IconButton sx={{ ml: 1 }}>
            <CalendarTodayIcon />
          </IconButton>
        </Box>
        {/* Campo per inserire la Master Key */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Master Key (hex)"
            placeholder="Inserisci Master Key"
            value={masterKey}
            onChange={(e) => setMasterKey(e.target.value)}
          />
        </Box>
        {error && (
          <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
      </Box>

      {/* Grafici per Dati in chiaro (Temperatura e Giroscopio) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          minHeight: '400px',
          p: 2
        }}
      >
        <Paper
          sx={{
            backgroundColor: '#f0f0f0',
            p: 2,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
            Grafico Dati - Temperatura
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={clearChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" name="Temperatura" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Paper
          sx={{
            backgroundColor: '#f0f0f0',
            p: 2,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
            Grafico Dati - Giroscopio
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={gyroChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="gx" stroke="#8884d8" name="Giroscopio X" />
              <Line type="monotone" dataKey="gy" stroke="#82ca9d" name="Giroscopio Y" />
              <Line type="monotone" dataKey="gz" stroke="#ffc658" name="Giroscopio Z" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      {/* Grafici per dati decriptati, se in modalità "decrypted" */}
      {mode === 'decrypted' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 2,
            minHeight: '400px',
            p: 2
          }}
        >
          <Paper
            sx={{
              backgroundColor: '#f0f0f0',
              p: 2,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
              Grafico Nascosti - Accelerometro
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={hiddenChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" name="Accelerometro" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <Paper
            sx={{
              backgroundColor: '#f0f0f0',
              p: 2,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
              Grafico Nascosti - GPS
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={gpsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="latitude" stroke="#82ca9d" name="Latitudine" />
                <Line type="monotone" dataKey="longitude" stroke="#ffc658" name="Longitudine" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      )}

      {/* Dettagli Payload */}
      <Box sx={{ px: 2, py: 2 }}>
        {data.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Dettagli Payload
            </Typography>
            {data.map((item, index) => (
              <Paper key={index} sx={{ p: 1, mb: 1 }}>
                <Typography variant="body2">
                  <strong>Counter:</strong> {item.counter}
                </Typography>
                {mode === 'decrypted' ? (
                  <>
                    <Typography variant="body2">
                      <strong>Decrypted Accelerometro:</strong>{' '}
                      {item.encryptedBlock.decryptedData
                        ? item.encryptedBlock.decryptedData.acceleration
                        : 'N/D'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Decrypted GPS:</strong> Latitudine:{' '}
                      {item.encryptedBlock.decryptedData
                        ? item.encryptedBlock.decryptedData.latitude
                        : 'N/D'}
                      , Longitudine:{' '}
                      {item.encryptedBlock.decryptedData
                        ? item.encryptedBlock.decryptedData.longitude
                        : 'N/D'}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body2">
                      <strong>Temperatura (Clear):</strong>{' '}
                      {item.clearBlock.temperature}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Giroscopio (Clear):</strong> X: {item.clearBlock.gx}
                      , Y: {item.clearBlock.gy}, Z: {item.clearBlock.gz}
                    </Typography>
                  </>
                )}
                <Typography variant="body2">
                  <strong>Timestamp:</strong>{' '}
                  {new Date(item.computedTimestamp * 1000).toLocaleString()}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default IOTA;
