// src/components/Home.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Avatar,
  Popover,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import EditIcon from '@mui/icons-material/Edit';

const waveAnimation = keyframes`
  0%, 100% { transform: translate3d(0, -20px, 0); }
  50% { transform: translate3d(0, 20px, 0); }
`;

const Home = () => {
  const navigate = useNavigate();

  // Stati per le credenziali
  const [nick, setNick] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [initDate, setInitDate] = useState('');
  const [openLogin, setOpenLogin] = useState(false);

  // Stati per il Popover del profilo
  const [anchorEl, setAnchorEl] = useState(null);
  // Stato per il Dialog di editing
  const [openEdit, setOpenEdit] = useState(false);
  const [editNick, setEditNick] = useState('');
  const [editVehicleId, setEditVehicleId] = useState('');
  const [editInitDate, setEditInitDate] = useState('');

  // Carica le credenziali dal localStorage
  useEffect(() => {
    const storedNick = localStorage.getItem('nick');
    const storedVehicleId = localStorage.getItem('vehicleId');
    const storedInitDate = localStorage.getItem('initDate');

    if (!storedNick || !storedVehicleId || !storedInitDate) {
      setOpenLogin(true);
    } else {
      setNick(storedNick);
      setVehicleId(storedVehicleId);
      setInitDate(storedInitDate);
    }
  }, []);

  // Salva le credenziali (usato sia nel login iniziale che nell'editing)
  const handleSaveProfile = (n, vId, iDate) => {
    if (n && vId && iDate) {
      localStorage.setItem('nick', n);
      localStorage.setItem('vehicleId', vId);
      localStorage.setItem('initDate', iDate);
      setNick(n);
      setVehicleId(vId);
      setInitDate(iDate);
      setOpenLogin(false);
      setOpenEdit(false);
    }
  };

  // Restituisce la prima lettera del nickname
  const getAvatarLetter = () => (nick ? nick.charAt(0).toUpperCase() : '');

  // Apertura del Popover al click sull'Avatar
  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handlePopoverClose = () => {
    setAnchorEl(null);
  };
  const openPopover = Boolean(anchorEl);

  // Avvia il form di editing: precompila i campi e chiude il Popover
  const handleEditProfile = () => {
    setEditNick(nick);
    setEditVehicleId(vehicleId);
    setEditInitDate(initDate);
    setOpenEdit(true);
    handlePopoverClose();
  };

  // Annulla l'editing
  const handleCancelEdit = () => {
    setOpenEdit(false);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        bgcolor: '#2a0845',
        backgroundImage: 'linear-gradient(45deg, #2a0845 0%, #6441A5 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Montserrat', sans-serif"
      }}
    >
      {/* Sfondo animato */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '140%',
            height: '140%',
            background:
              'radial-gradient(at top left, #A865C9, transparent), radial-gradient(at bottom right, #D8B5FF, transparent)',
            animation: `${waveAnimation} 12s ease-in-out infinite alternate`,
            opacity: 0.6,
            filter: 'blur(100px)'
          }}
        />
      </Box>

      {/* Avatar in alto a sinistra */}
      {nick && (
        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>
          <Avatar
            onClick={handleAvatarClick}
            sx={{ bgcolor: '#6441A5', cursor: 'pointer' }}
          >
            {getAvatarLetter()}
          </Avatar>
          <Popover
            open={openPopover}
            anchorEl={anchorEl}
            onClose={handlePopoverClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left'
            }}
          >
            <Box sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="subtitle1" gutterBottom>
                {nick}
              </Typography>
              <Typography variant="body2">
                Vehicle ID: {vehicleId}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Data Inizio: {initDate}
              </Typography>
              <Button
                size="small"
                onClick={handleEditProfile}
                startIcon={<EditIcon />}
                variant="outlined"
                fullWidth
              >
                Cambia utente
              </Button>
            </Box>
          </Popover>
        </Box>
      )}

      {/* Contenuto principale */}
      <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: '700',
            color: '#fff',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            px: 4,
            py: 2,
            borderRadius: '20px',
            boxShadow: '0px 4px 15px rgba(0,0,0,0.2)',
            mb: 6
          }}
        >
          Scegli la piattaforma
        </Typography>

        <Box sx={{ display: 'flex', gap: 6, mt: 4 }}>
          <Card
            sx={{
              width: 420,
              height: 420,
              borderRadius: 4,
              boxShadow: '0px 10px 30px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'scale(1.08)' }
            }}
          >
            <CardActionArea
              onClick={() => navigate('/sui')}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <CardMedia
                component="img"
                image="/sui-logo.png"
                alt="SUI"
                sx={{ height: '70%', objectFit: 'contain', p: 2 }}
              />
              <CardContent>
                <Typography variant="h4" align="center">
                  SUI
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>

          <Card
            sx={{
              width: 420,
              height: 420,
              borderRadius: 4,
              boxShadow: '0px 10px 30px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'scale(1.08)' }
            }}
          >
            <CardActionArea
              onClick={() => navigate('/iota')}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <CardMedia
                component="img"
                image="/iota-logo.png"
                alt="IOTA"
                sx={{ width: '80%', height: '80%', objectFit: 'contain', mx: 'auto' }}
              />
              <CardContent>
                <Typography variant="h4" align="center">
                  IOTA
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>

        {/* Dialog per il login iniziale */}
        <Dialog open={openLogin}>
          <DialogTitle sx={{ fontFamily: 'Montserrat' }}>
            Accedi al tuo profilo
          </DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Nickname"
              fullWidth
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Vehicle ID"
              fullWidth
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Data di Inizio"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={initDate}
              onChange={(e) => setInitDate(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleSaveProfile(nick, vehicleId, initDate)}>
              Salva
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog per modificare le credenziali */}
        <Dialog open={openEdit} onClose={handleCancelEdit}>
          <DialogTitle sx={{ fontFamily: 'Montserrat' }}>
            Modifica le tue credenziali
          </DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Nickname"
              fullWidth
              value={editNick}
              onChange={(e) => setEditNick(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Vehicle ID"
              fullWidth
              value={editVehicleId}
              onChange={(e) => setEditVehicleId(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Data di Inizio"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={editInitDate}
              onChange={(e) => setEditInitDate(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelEdit}>Annulla</Button>
            <Button onClick={() => handleSaveProfile(editNick, editVehicleId, editInitDate)}>
              Salva
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Home;
