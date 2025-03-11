import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Grid,
  AppBar,
  Toolbar
} from '@mui/material';
import { fetchSensorData } from '../services/IotaEvmService';
import { computeDateKey, formatTimestamp, uint8ArrayToHex } from '../lib/utils';
import { computeDailyKey, decryptBlock } from '../lib/decryption';
import { decodePayload, translateBlocks } from '../lib/payload';
import SensorCards from './SensorCards';


const IotaEvmDashboard = ({ vehicleId }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [dataBatches, setDataBatches] = useState([]);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [dailyKeyInput, setDailyKeyInput] = useState('');
  const [dailyKeyHex, setDailyKeyHex] = useState('');
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFetchData = async () => {
    if (!selectedDate) {
      setError("Please select a date.");
      setSnackbarOpen(true);
      return;
    }
    if (!vehicleId) {
      setError("Vehicle ID is not set.");
      setSnackbarOpen(true);
      return;
    }
    setLoading(true);
    try {
      const dateKey = computeDateKey(selectedDate);
      const batches = await fetchSensorData(vehicleId, dateKey);
      setDataBatches(batches);
      setDailyKeyHex('');
    } catch (err) {
      console.error("Error fetching sensor data:", err);
      setError("Error fetching data from the contract.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!selectedDate) {
      setError("Please select a date first.");
      setSnackbarOpen(true);
      return;
    }
    if (!dailyKeyInput && !masterKeyInput) {
      setError("Please enter either a daily key or a master key.");
      setSnackbarOpen(true);
      return;
    }
    setError('');
    let dailyKey;
    try {
      if (masterKeyInput) {
        let cleanedMasterKey = masterKeyInput.trim();
        if (cleanedMasterKey.startsWith('0x')) {
          cleanedMasterKey = cleanedMasterKey.slice(2);
        }
        dailyKey = await computeDailyKey(cleanedMasterKey, selectedDate);
        setDailyKeyHex(uint8ArrayToHex(dailyKey));
      } else {
        if (!/^[0-9a-fA-F]{64}$/.test(dailyKeyInput.trim())) {
          throw new Error("Daily key must be a 64-character hex string (32 bytes).");
        }
        dailyKey = new Uint8Array(
          dailyKeyInput.trim().match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        setDailyKeyHex(dailyKeyInput.trim());
      }
      const updatedDecoded = await Promise.all(
        dataBatches.map(async (batch) => {
          const updatedBlocks = await Promise.all(
            batch.blocks.map(async (block) => {
              if (block.encrypted) {
                const clearBits = await decryptBlock(block.payloadBits, dailyKey);
                const sensorTypeDecrypted = parseInt(clearBits.substr(3, 4), 2);
                if (![1, 2, 3].includes(sensorTypeDecrypted)) {
                  throw new Error("Decrypted payload has an invalid sensor type. Possibly the wrong key or wrong day.");
                }
                return { ...block, decryptedClearPayload: clearBits };
              }
              return block;
            })
          );
          const translated = translateBlocks(updatedBlocks);
          return { ...batch, blocks: updatedBlocks, translated };
        })
      );
      setDataBatches(updatedDecoded);
    } catch (err) {
      console.error("Decryption error:", err);
      setError("Error decrypting data. Possibly the key is wrong or invalid.");
      setSnackbarOpen(true);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ paddingTop: 2 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            IOTAEVM Dashboard - {vehicleId}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ marginTop: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField
              label="Select Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={handleFetchData} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Data'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      {dataBatches.length > 0 ? (
        <Box sx={{ marginTop: 3 }}>
          <Typography variant="h5" gutterBottom>Data Batches</Typography>
          {dataBatches.map((batch, idx) => {
            const humanTime = formatTimestamp(batch.timestamp);
            return (
              <Card key={idx} sx={{ marginBottom: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1">
                    <strong>Timestamp:</strong> {batch.timestamp} ({humanTime})
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Payload (hex):</strong> {batch.hexData}
                  </Typography>
                  <Box sx={{ marginTop: 1 }}>
                    <Typography variant="subtitle2">Blocks:</Typography>
                    {batch.blocks.map((blk, i) => {
                      const isDecrypted = blk.encrypted && blk.decryptedClearPayload;
                      const finalSensorType = isDecrypted
                        ? parseInt(blk.decryptedClearPayload.substr(3, 4), 2)
                        : blk.sensorType;
                      return (
                        <Typography key={i} variant="body2">
                          <code>{blk.blockHex}</code> &nbsp;
                          [Encrypted: {blk.encrypted ? "Yes" : "No"}; Sensor Type: {finalSensorType || "N/A"};
                          Payload: {isDecrypted ? blk.decryptedClearPayload : blk.payloadBits}]
                        </Typography>
                      );
                    })}
                  </Box>
                  <Box sx={{ marginTop: 1 }}>
                    <Typography variant="subtitle2">Translated Readings:</Typography>
                    {batch.translated.map((reading, i) => (
                      <Typography key={i} variant="body2">
                        {reading.label === "Encrypted (not decrypted)" ? (
                          <strong>Block {i + 1}:</strong> + " " + reading.label
                        ) : reading.label === "DHT11" ? (
                          <>
                            <strong>Block {i + 1} - {reading.label}:</strong> Temp: {reading.temperature} °C, Humidity: {reading.humidity} %
                          </>
                        ) : reading.label === "Accelerometer" ? (
                          <>
                            <strong>Block {i + 1} - {reading.label}:</strong> Acceleration: {reading.acceleration} m/s²
                          </>
                        ) : reading.label === "Gyroscope" ? (
                          <>
                            <strong>Block {i + 1} - {reading.label}:</strong> X: {reading.gyroX} deg/s, Y: {reading.gyroY} deg/s, Z: {reading.gyroZ}
                          </>
                        ) : (
                          <>
                            <strong>Block {i + 1}:</strong> {reading.label}
                          </>
                        )}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        !loading && <Typography>No data fetched yet.</Typography>
      )}
      {dataBatches.length > 0 && (
        <Box sx={{ marginTop: 3, padding: 2, border: '1px solid #ccc', borderRadius: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            Decrypt Encrypted Blocks
          </Typography>
          <Typography variant="body2" gutterBottom>
            Provide either a Daily Key (64 hex chars) or enter your Master Key to compute it.
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Daily Key (optional)"
                fullWidth
                value={dailyKeyInput}
                onChange={(e) => setDailyKeyInput(e.target.value)}
                placeholder="Enter daily key (64 hex characters)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Master Key (optional)"
                fullWidth
                value={masterKeyInput}
                onChange={(e) => setMasterKeyInput(e.target.value)}
                placeholder="Enter master key"
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleDecrypt}>
                Decrypt Data
              </Button>
            </Grid>
          </Grid>
          {dailyKeyHex && (
            <Typography variant="body2" sx={{ marginTop: 1 }}>
              <strong>Daily Key (hex):</strong> {dailyKeyHex}
            </Typography>
          )}
        </Box>
      )}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="error" onClose={() => setSnackbarOpen(false)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
    
  );
  

  
};

export default IotaEvmDashboard;
