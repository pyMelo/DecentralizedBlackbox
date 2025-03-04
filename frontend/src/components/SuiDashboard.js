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

/**
 * SuiDashboard Component:
 * - Receives a global vehicleId as a prop.
 * - Lets the user select a date.
 * - When "Fetch Data" is clicked, it calls the service function to fetch sensor data inputs,
 *   then filters the results based on the selected date and vehicleId.
 * - Displays the sensor data records.
 */
export default function SuiDashboard({ vehicleId }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [sensorDataArray, setSensorDataArray] = useState([]);
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
      // Fetch sensor data records from the SUI service.
      const allData = await fetchSensorDataInputs();
      
      // Convert the selected date to a time window.
      const startTimestamp = Math.floor(new Date(selectedDate).getTime() / 1000);
      const endTimestamp = startTimestamp + 86400; // 24 hours later

      // Filter records that match the global vehicleId and whose timestamp falls within the selected day.
      const filteredData = allData.filter(record => {
        const ts = parseInt(record.timestamp);
        return record.vehicleId === vehicleId && ts >= startTimestamp && ts < endTimestamp;
      });
      
      setSensorDataArray(filteredData);
    } catch (err) {
      setError("Error fetching sensor data.");
      setSnackbarOpen(true);
      console.error(err);
    } finally {
      setLoading(false);
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
                Timestamp: {record.timestamp} ({new Date(parseInt(record.timestamp) * 1000).toLocaleString()})
              </Typography>
              <Typography variant="body2">
                Hex Data: {record.hexData}
              </Typography>
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
