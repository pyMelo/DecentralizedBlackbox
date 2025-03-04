import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Box,
} from '@mui/material';
import { fetchIotaDataOnlyTransactionByDateAndId } from '../services/IotaDataService';

export default function IotaOnlyDashboard({ vehicleId }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [dataRecord, setDataRecord] = useState(null);
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
      const result = await fetchIotaDataOnlyTransactionByDateAndId(selectedDate, vehicleId);
      if (!result) {
        setError("No data found for the selected date and vehicle.");
        setSnackbarOpen(true);
      }
      setDataRecord(result);
    } catch (err) {
      console.error(err);
      setError("Error fetching IOTA Data‑Only data.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container sx={{ marginTop: 4 }}>
      <Typography variant="h5" gutterBottom>
        IOTA Data‑Only Dashboard - {vehicleId}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
      </Box>
      {dataRecord ? (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1">
              Block ID: {dataRecord.blockId}
            </Typography>
            <Typography variant="body2">
              Tag: {dataRecord.tag}
            </Typography>
            <Typography variant="body2">
              Message: {dataRecord.message}
            </Typography>
            <Typography variant="body2">
              Timestamp: {dataRecord.timestamp}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        !loading && <Typography>No data fetched yet.</Typography>
      )}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="error" onClose={() => setSnackbarOpen(false)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
