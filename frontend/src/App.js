import React, { useState } from 'react';
import PlatformSelector from './components/PlatformSelector';
import MainDashboard from './components/MainDashboard';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container
} from '@mui/material';

function App() {
  const [platform, setPlatform] = useState('IOTAEVM');
  const [vehicleId, setVehicleId] = useState('');
  const [openDialog, setOpenDialog] = useState(true);

  const handleVehicleSubmit = () => {
    if (vehicleId.trim() !== '') {
      setOpenDialog(false);
    }
  };

  const handleChangeVehicleId = () => {
    setVehicleId('');
    setOpenDialog(true);
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            My Sensor Dashboard
          </Typography>
          {vehicleId && (
            <Button variant="contained" color="secondary" onClick={handleChangeVehicleId}>
              Change Vehicle ID
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container sx={{ marginTop: 2 }}>
        <PlatformSelector platform={platform} onPlatformChange={setPlatform} />
      </Container>

      <MainDashboard vehicleId={vehicleId} platform={platform} />

      <Dialog open={openDialog} disableEscapeKeyDown>
        <DialogTitle>Enter Vehicle ID</DialogTitle>
        <DialogContent>
          <TextField
            label="Vehicle ID"
            fullWidth
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="Enter your vehicle ID"
            margin="normal"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleVehicleSubmit}
              disabled={!vehicleId.trim()}
            >
              Confirm
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default App;
