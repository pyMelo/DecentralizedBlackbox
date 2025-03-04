import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const PlaceholderPlatform = ({ platform }) => {
  return (
    <Container maxWidth="md" sx={{ marginTop: 4 }}>
      <Box sx={{ textAlign: 'center', padding: 4, border: '1px dashed #ccc', borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          {platform} Platform
        </Typography>
        <Typography variant="body1">
          This platform is under development. Stay tuned for updates!
        </Typography>
      </Box>
    </Container>
  );
};

export default PlaceholderPlatform;
