import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import { fetchSensorDataInputs } from '../services/SuiService';
import { decodePayload, translateBlocks } from '../lib/payload';
import { computeDailyKey, decryptBlock } from '../lib/decryption';
import { uint8ArrayToHex, formatTimestamp } from '../lib/utils';

export default function SuiDashboard({ vehicleId }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [sensorDataArray, setSensorDataArray] = useState([]);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [dailyKeyInput, setDailyKeyInput] = useState('');
  const [dailyKeyHex, setDailyKeyHex] = useState('');
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleFetchData() {
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
      const allData = await fetchSensorDataInputs();
      const startTimestamp = Math.floor(new Date(selectedDate).getTime() / 1000);
      const endTimestamp = startTimestamp + 86400;
      const filteredData = allData.filter(record => {
        const ts = parseInt(record.timestamp);
        return record.vehicleId === vehicleId && ts >= startTimestamp && ts < endTimestamp;
      });
      setSensorDataArray(filteredData);
    } catch (err) {
      console.error(err);
      setError("Error fetching sensor data.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecrypt() {
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
      
      const updatedData = await Promise.all(
        sensorDataArray.map(async (record) => {
          // Decode the payload (hex string) into 5-byte blocks.
          const blocks = decodePayload(record.hexData);
          
          // Process each block: if encrypted, decrypt it.
          const updatedBlocks = await Promise.all(
            blocks.map(async (block) => {
              if (block.encrypted) {
                try {
                  let decryptedClearPayload = await decryptBlock(block.payloadBits, dailyKey);
                  // Ensure the decrypted payload is exactly 39 bits long by left-padding with zeros if needed.
                  if (decryptedClearPayload.length < 39) {
                    decryptedClearPayload = decryptedClearPayload.padStart(39, '0');
                  }
                  return { ...block, decryptedClearPayload };
                } catch (err) {
                  console.error("Error decrypting block:", err);
                  return block;
                }
              }
              return block;
            })
          );
          
          // Translate blocks into sensor readings.
          const translated = translateBlocks(updatedBlocks);
          return { ...record, blocks: updatedBlocks, translated };
        })
      );
      setSensorDataArray(updatedData);
    } catch (err) {
      console.error("Decryption error:", err);
      setError("Error decrypting data. Possibly the key is wrong or invalid.");
      setSnackbarOpen(true);
    }
  }

  return (
    <Container sx={{ marginTop: 4 }}>
      <Typography variant="h5" gutterBottom>
        SUI Sensor Data for Vehicle: {vehicleId}
      </Typography>
      <TextField
        label="Select Date"
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
      <Button variant="contained" onClick={handleFetchData} disabled={loading} sx={{ ml: 2 }}>
        {loading ? "Loading..." : "Fetch Data"}
      </Button>
      
      {sensorDataArray.length > 0 && (
        <Box sx={{ marginTop: 3, p: 2, border: '1px solid #ccc', borderRadius: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            Decrypt Sensor Data
          </Typography>
          <TextField
            label="Daily Key (optional)"
            value={dailyKeyInput}
            onChange={(e) => setDailyKeyInput(e.target.value)}
            placeholder="Enter daily key (64 hex characters)"
            fullWidth
            sx={{ my: 1 }}
          />
          <TextField
            label="Master Key (optional)"
            value={masterKeyInput}
            onChange={(e) => setMasterKeyInput(e.target.value)}
            placeholder="Enter master key"
            fullWidth
            sx={{ my: 1 }}
          />
          <Button variant="contained" onClick={handleDecrypt}>
            Decrypt Data
          </Button>
          {dailyKeyHex && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Daily Key (hex):</strong> {dailyKeyHex}
            </Typography>
          )}
        </Box>
      )}
      
      {sensorDataArray.length > 0 ? (
        sensorDataArray.map((record, idx) => (
          <Card key={idx} sx={{ my: 2 }}>
            <CardContent>
              <Typography variant="subtitle1">
                Transaction: {record.txDigest}
              </Typography>
              <Typography variant="body2">
                Vehicle ID: {record.vehicleId}
              </Typography>
              <Typography variant="body2">
                Timestamp: {record.timestamp} ({formatTimestamp(record.timestamp)})
              </Typography>
              <Typography variant="body2">
                Hex Data: {record.hexData}
              </Typography>
              {record.translated && record.translated.map((reading, i) => (
                <Typography key={i} variant="body2">
                  <strong>Block {i + 1} - {reading.label}:</strong> { 
                    reading.label === "DHT11"
                      ? `Temp: ${reading.temperature}°C, Humidity: ${reading.humidity}%`
                      : reading.label === "Accelerometer"
                        ? `Acceleration: ${reading.acceleration} m/s²`
                        : reading.label === "Gyroscope"
                          ? `GyroX: ${reading.gyroX} deg/s, GyroY: ${reading.gyroY} deg/s`
                          : reading.label
                  }
                </Typography>
              ))}
            </CardContent>
          </Card>
        ))
      ) : (
        !loading && <Typography>No sensor data found for the selected date.</Typography>
      )}
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity="error" onClose={() => setSnackbarOpen(false)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
