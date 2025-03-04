import React from 'react';
import { Container } from '@mui/material';
import IotaEvmDashboard from './IotaDashboard';
import IotaOnlyDashboard from './IotaOnlyDashboard';
import SuiDashboard from './SuiDashboard';

const MainDashboard = ({ vehicleId, platform }) => {
  return (
    <Container>
      {platform === "IOTAEVM" && (
        <IotaEvmDashboard vehicleId={vehicleId} />
      )}
      {platform === "IOTA Data-only" && (
        <IotaOnlyDashboard vehicleId={vehicleId} />
      )}
      {platform === "SUI" && (
        <SuiDashboard vehicleId={vehicleId} />
      )}
    </Container>
  );
};

export default MainDashboard;
