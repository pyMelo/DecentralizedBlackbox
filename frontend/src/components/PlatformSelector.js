import React from 'react';
import { Container, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';

const PlatformSelector = ({ platform, onPlatformChange }) => {
  const handleChange = (event) => {
    onPlatformChange(event.target.value);
  };

  return (
    <Container maxWidth="sm" sx={{ marginTop: 4 }}>
      <Typography variant="h5" gutterBottom>
        Select Data Platform
      </Typography>
      <FormControl fullWidth>
        <InputLabel id="platform-select-label">Platform</InputLabel>
        <Select
          labelId="platform-select-label"
          id="platform-select"
          value={platform}
          label="Platform"
          onChange={handleChange}
        >
          <MenuItem value="IOTAEVM">IOTAEVM</MenuItem>
          <MenuItem value="IOTA Data-only">IOTA Data-only</MenuItem>
          <MenuItem value="SUI">SUI</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="body1" sx={{ marginTop: 2 }}>
        Selected platform: {platform}
      </Typography>
    </Container>
  );
};

export default PlatformSelector;
