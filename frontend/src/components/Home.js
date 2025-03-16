"use client"

// src/components/Home.js
import { useState, useEffect } from "react"
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
  useMediaQuery,
  Backdrop,
  CircularProgress,
  Zoom,
  Fade,
} from "@mui/material"
import { useNavigate } from "react-router-dom"
import { keyframes } from "@emotion/react"
import EditIcon from "@mui/icons-material/Edit"
import { styled } from "@mui/system"

// Enhanced animations
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`

// Styled components
const GlassCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-10px) scale(1.02)",
    boxShadow: "0 15px 40px rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
  },
}))

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  "&:hover": {
    transform: "scale(1.1)",
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.2)",
  },
}))

const GlassButton = styled(Button)(({ theme }) => ({
  backdropFilter: "blur(10px)",
  borderRadius: "12px",
  padding: "10px 24px",
  fontWeight: 600,
  letterSpacing: "0.5px",
  textTransform: "none",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.2)",
  },
}))

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
    background: "rgba(255, 255, 255, 0.1)",
    "& fieldset": {
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255, 255, 255, 0.5)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#A865C9",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.7)",
  },
  "& .MuiInputBase-input": {
    color: "white",
  },
}))

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: "linear-gradient(45deg, #2a0845 0%, #6441A5 100%)",
  color: "white",
  padding: "16px 24px",
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
}))

const Home = () => {
  const navigate = useNavigate()
  const isMobile = useMediaQuery("(max-width:768px)")

  // Stati per le credenziali
  const [nick, setNick] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [initDate, setInitDate] = useState("")
  const [openLogin, setOpenLogin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Stati per il Popover del profilo
  const [anchorEl, setAnchorEl] = useState(null)
  // Stato per il Dialog di editing
  const [openEdit, setOpenEdit] = useState(false)
  const [editNick, setEditNick] = useState("")
  const [editVehicleId, setEditVehicleId] = useState("")
  const [editInitDate, setEditInitDate] = useState("")

  // Carica le credenziali dal localStorage
  useEffect(() => {
    const storedNick = localStorage.getItem("nick")
    const storedVehicleId = localStorage.getItem("vehicleId")
    const storedInitDate = localStorage.getItem("initDate")

    // Simulate loading
    setTimeout(() => {
      if (!storedNick || !storedVehicleId || !storedInitDate) {
        setOpenLogin(true)
      } else {
        setNick(storedNick)
        setVehicleId(storedVehicleId)
        setInitDate(storedInitDate)
      }
      setLoading(false)
    }, 1000)
  }, [])

  // Salva le credenziali (usato sia nel login iniziale che nell'editing)
  const handleSaveProfile = (n, vId, iDate) => {
    if (n && vId && iDate) {
      localStorage.setItem("nick", n)
      localStorage.setItem("vehicleId", vId)
      localStorage.setItem("initDate", iDate)
      setNick(n)
      setVehicleId(vId)
      setInitDate(iDate)
      setOpenLogin(false)
      setOpenEdit(false)
    }
  }

  // Restituisce la prima lettera del nickname
  const getAvatarLetter = () => (nick ? nick.charAt(0).toUpperCase() : "")

  // Apertura del Popover al click sull'Avatar
  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget)
  }
  const handlePopoverClose = () => {
    setAnchorEl(null)
  }
  const openPopover = Boolean(anchorEl)

  // Avvia il form di editing: precompila i campi e chiude il Popover
  const handleEditProfile = () => {
    setEditNick(nick)
    setEditVehicleId(vehicleId)
    setEditInitDate(initDate)
    setOpenEdit(true)
    handlePopoverClose()
  }

  // Annulla l'editing
  const handleCancelEdit = () => {
    setOpenEdit(false)
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        bgcolor: "#2a0845",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Montserrat', sans-serif",
        // Base background color
        background: "linear-gradient(135deg, #2a0845 0%, #6441A5 100%)",
      }}
    >
      {/* Fixed wavy pattern background */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          opacity: 0.6,
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E"),
            url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 27.5c0 8.284 6.716 15 15 15 8.284 0 15-6.716 15-15 0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15zm100 0c0 8.284-6.716 15-15 15-8.284 0-15-6.716-15-15 0-8.284 6.716-15 15-15 8.284 0 15 6.716 15 15zM0 77.5c0 8.284 6.716 15 15 15 8.284 0 15-6.716 15-15 0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15zm100 0c0 8.284-6.716 15-15 15-8.284 0-15-6.716-15-15 0-8.284 6.716-15 15-15 8.284 0 15 6.716 15 15z' fill='%23a865c9' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")
          `,
        }}
      />

      {/* Wave pattern overlay */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          opacity: 0.4,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='pattern' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 0,50 C 20,30 40,30 50,50 C 60,70 80,70 100,50 L 100,100 L 0,100 Z' fill='%23d8b5ff' fill-opacity='0.2'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23pattern)'/%3E%3C/svg%3E")`,
          backgroundSize: "100% 100px",
          backgroundRepeat: "repeat-y",
        }}
      />

      {/* Curved wave pattern */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "300px",
          zIndex: 0,
          opacity: 0.5,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23a865c9' fill-opacity='0.3' d='M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Diagonal wave pattern */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "100%",
          height: "300px",
          zIndex: 0,
          opacity: 0.4,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23d8b5ff' fill-opacity='0.3' d='M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,133.3C672,139,768,181,864,181.3C960,181,1056,139,1152,122.7C1248,107,1344,117,1392,122.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          transform: "rotate(180deg)",
        }}
      />

      {/* Loading overlay */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(8px)",
          background: "rgba(42, 8, 69, 0.7)",
        }}
        open={loading}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress color="inherit" size={60} thickness={4} />
          <Typography
            variant="h6"
            sx={{
              mt: 2,
              fontWeight: 600,
              animation: `${floatAnimation} 2s ease-in-out infinite`,
            }}
          >
            Inizializzazione...
          </Typography>
        </Box>
      </Backdrop>

      {/* Avatar in alto a sinistra */}
      {nick && (
        <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 2 }}>
          <StyledAvatar
            onClick={handleAvatarClick}
            sx={{
              bgcolor: "#6441A5",
              width: 48,
              height: 48,
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            {getAvatarLetter()}
          </StyledAvatar>
          <Popover
            open={openPopover}
            anchorEl={anchorEl}
            onClose={handlePopoverClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            PaperProps={{
              sx: {
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                overflow: "hidden",
              },
            }}
          >
            <Box sx={{ p: 3, minWidth: 250 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: "#2a0845" }}>
                {nick}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5, color: "#666" }}>
                <strong>Vehicle ID:</strong> {vehicleId}
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ mb: 2, color: "#666" }}>
                <strong>Data Inizio:</strong> {initDate}
              </Typography>
              <GlassButton
                size="medium"
                onClick={handleEditProfile}
                startIcon={<EditIcon />}
                variant="contained"
                fullWidth
                sx={{
                  background: "linear-gradient(45deg, #2a0845 0%, #6441A5 100%)",
                  color: "white",
                }}
              >
                Cambia utente
              </GlassButton>
            </Box>
          </Popover>
        </Box>
      )}

      {/* Contenuto principale */}
      <Fade in={!loading} timeout={1000}>
        <Box sx={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%", px: 2 }}>
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              fontWeight: "700",
              color: "#fff",
              backdropFilter: "blur(8px)",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              px: 4,
              py: 2,
              borderRadius: "20px",
              boxShadow: "0px 4px 15px rgba(0,0,0,0.2)",
              mb: 6,
              maxWidth: "600px",
              mx: "auto",
              textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
            Scegli la piattaforma
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 6,
              mt: 4,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Zoom in={!loading} style={{ transitionDelay: !loading ? "300ms" : "0ms" }}>
              <GlassCard
                sx={{
                  width: isMobile ? "90%" : 420,
                  height: 420,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <CardActionArea
                  onClick={() => {
                    console.log("Navigating to /sui")
                    navigate("/sui")
                  }}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    background: "rgba(255, 255, 255, 0.05)",
                    position: "relative",
                    zIndex: 1,
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
                      zIndex: -1,
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "radial-gradient(circle at center, rgba(168,101,201,0.2) 0%, rgba(42,8,69,0) 70%)",
                      opacity: 0.7,
                      zIndex: -1,
                    }}
                  />
                  <CardMedia
                    component="img"
                    image="/sui-logo.png"
                    alt="SUI"
                    sx={{
                      width: "60%",
                      height: "60%",
                      objectFit: "contain",
                      mx: "auto",
                      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                      animation: `${floatAnimation} 4s ease-in-out infinite`,
                    }}
                  />
                  <CardContent>
                    <Typography
                      variant="h4"
                      align="center"
                      sx={{
                        color: "white",
                        fontWeight: 700,
                        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                        letterSpacing: "1px",
                      }}
                    >
                      SUI
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </GlassCard>
            </Zoom>

            <Zoom in={!loading} style={{ transitionDelay: !loading ? "600ms" : "0ms" }}>
              <GlassCard
                sx={{
                  width: isMobile ? "90%" : 420,
                  height: 420,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <CardActionArea
                  onClick={() => {
                    console.log("Navigating to /iota")
                    navigate("/iota")
                  }}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    background: "rgba(255, 255, 255, 0.05)",
                    position: "relative",
                    zIndex: 1,
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
                      zIndex: -1,
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "radial-gradient(circle at center, rgba(216,181,255,0.2) 0%, rgba(42,8,69,0) 70%)",
                      opacity: 0.7,
                      zIndex: -1,
                    }}
                  />
                  <CardMedia
                    component="img"
                    image="/iota-logo.png"
                    alt="IOTA"
                    sx={{
                      width: "60%",
                      height: "60%",
                      objectFit: "contain",
                      mx: "auto",
                      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                      animation: `${floatAnimation} 4s ease-in-out infinite 1s`,
                    }}
                  />
                  <CardContent>
                    <Typography
                      variant="h4"
                      align="center"
                      sx={{
                        color: "white",
                        fontWeight: 700,
                        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                        letterSpacing: "1px",
                      }}
                    >
                      IOTA
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </GlassCard>
            </Zoom>
          </Box>

          {/* Dialog per il login iniziale */}
          <Dialog
            open={openLogin}
            PaperProps={{
              sx: {
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                overflow: "hidden",
              },
            }}
          >
            <StyledDialogTitle>Accedi al tuo profilo</StyledDialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Box sx={{ my: 1 }}>
                <TextField
                  margin="dense"
                  label="Nickname"
                  fullWidth
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />
                <TextField
                  margin="dense"
                  label="Vehicle ID"
                  fullWidth
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />
                <TextField
                  margin="dense"
                  label="Data di Inizio"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={initDate}
                  onChange={(e) => setInitDate(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <GlassButton
                onClick={() => handleSaveProfile(nick, vehicleId, initDate)}
                variant="contained"
                sx={{
                  background: "linear-gradient(45deg, #2a0845 0%, #6441A5 100%)",
                  color: "white",
                }}
              >
                Salva
              </GlassButton>
            </DialogActions>
          </Dialog>

          {/* Dialog per modificare le credenziali */}
          <Dialog
            open={openEdit}
            onClose={handleCancelEdit}
            PaperProps={{
              sx: {
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)',255,255,0.95)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                overflow: "hidden",
              },
            }}
          >
            <StyledDialogTitle>Modifica le tue credenziali</StyledDialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Box sx={{ my: 1 }}>
                <TextField
                  margin="dense"
                  label="Nickname"
                  fullWidth
                  value={editNick}
                  onChange={(e) => setEditNick(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />
                <TextField
                  margin="dense"
                  label="Vehicle ID"
                  fullWidth
                  value={editVehicleId}
                  onChange={(e) => setEditVehicleId(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />
                <TextField
                  margin="dense"
                  label="Data di Inizio"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={editInitDate}
                  onChange={(e) => setEditInitDate(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <GlassButton onClick={handleCancelEdit} variant="outlined" sx={{ mr: 1 }}>
                Annulla
              </GlassButton>
              <GlassButton
                onClick={() => handleSaveProfile(editNick, editVehicleId, editInitDate)}
                variant="contained"
                sx={{
                  background: "linear-gradient(45deg, #2a0845 0%, #6441A5 100%)",
                  color: "white",
                }}
              >
                Salva
              </GlassButton>
            </DialogActions>
          </Dialog>
        </Box>
      </Fade>
    </Box>
  )
}

export default Home

