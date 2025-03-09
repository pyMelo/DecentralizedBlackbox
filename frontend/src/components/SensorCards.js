// SensorCards.js
import React from 'react';
import { Container, Grid, Card, CardContent, Typography } from '@mui/material';

const SensorCard = ({ title, children }) => (
  <Card sx={{ minHeight: 150 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      {children}
    </CardContent>
  </Card>
);

const SensorCards = ({ sensorData = {} }) => {
  return (
    <Container sx={{ marginTop: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SensorCard title="Temperatura e Umidità">
            {sensorData.temperature ? (
              <>
                <Typography>Temperatura: {sensorData.temperature.value} °C</Typography>
                <Typography>Umidità: {sensorData.temperature.humidity} %</Typography>
              </>
            ) : (
              <Typography>Nessun dato disponibile.</Typography>
            )}
          </SensorCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SensorCard title="Giroscopio">
            {sensorData.gyroscope ? (
              <>
                <Typography>X: {sensorData.gyroscope.x} deg/s</Typography>
                <Typography>Y: {sensorData.gyroscope.y} deg/s</Typography>
                <Typography>Z: {sensorData.gyroscope.z} deg/s</Typography>
              </>
            ) : (
              <Typography>Nessun dato disponibile.</Typography>
            )}
          </SensorCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SensorCard title="Accelerazione">
            {sensorData.acceleration ? (
              <Typography>Accelerazione: {sensorData.acceleration.value} m/s²</Typography>
            ) : (
              <Typography>Nessun dato disponibile.</Typography>
            )}
          </SensorCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SensorCard title="GPS">
            <Typography>Dati GPS non ancora disponibili.</Typography>
          </SensorCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SensorCards;
