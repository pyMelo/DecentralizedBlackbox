"use client"

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
  Tooltip,
  Divider,
  IconButton,
  Alert,
} from "@mui/material"
import { useNavigate , Link } from "react-router-dom"
import EditIcon from "@mui/icons-material/Edit"
import AccountCircleIcon from "@mui/icons-material/AccountCircle"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar"
import InfoIcon from "@mui/icons-material/Info"
import SecurityIcon from "@mui/icons-material/Security"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import CalculateIcon from "@mui/icons-material/Calculate"
import KeyIcon from "@mui/icons-material/Key"
import { styled } from "@mui/system"

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

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: "linear-gradient(45deg, #2a0845 0%, #6441A5 100%)",
  color: "white",
  padding: "16px 24px",
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
}))

const PlatformCard = styled(GlassCard)(({ theme, platform }) => ({
  width: "100%",
  height: 420,
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      platform === "sui"
        ? "linear-gradient(135deg, rgba(100, 65, 165, 0.2) 0%, transparent 80%)"
        : "linear-gradient(225deg, rgba(100, 65, 165, 0.2) 0%, transparent 80%)",
    zIndex: 0,
    transition: "opacity 0.5s ease",
    opacity: 0.7,
  },
  "&:hover::before": {
    opacity: 1,
  },
}))

const GlowingBorder = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: -2,
  left: -2,
  right: -2,
  bottom: -2,
  borderRadius: "26px",
  background: "linear-gradient(45deg, #6441A5, #2a0845, #A865C9, #6441A5)",
  backgroundSize: "400% 400%",
  zIndex: -1,
  animation: "gradientBG 8s ease infinite",
  "@keyframes gradientBG": {
    "0%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
    "100%": { backgroundPosition: "0% 50%" },
  },
}))

const TechBadge = styled(Box)(({ theme }) => ({
  position: "absolute",
  padding: "4px 12px",
  borderRadius: "20px",
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(5px)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  color: "white",
  fontSize: "0.75rem",
  fontWeight: 600,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  zIndex: 1,
}))

// Funzione per generare la daily key
const generateDailyKeySHA256 = async (masterKey, vehicleId, initDate, date) => {
  try {
    // Rimuovi eventuali spazi e prefissi "0x" dalla master key
    const cleanMasterKey = masterKey.replace(/\s+/g, "").toLowerCase().startsWith("0x")
      ? masterKey.replace(/\s+/g, "").toLowerCase().slice(2)
      : masterKey.replace(/\s+/g, "").toLowerCase()

    // Converti la master key da hex a array di byte
    const masterKeyBytes = new Uint8Array(cleanMasterKey.match(/.{1,2}/g).map((byte) => Number.parseInt(byte, 16)))

    // Crea un messaggio combinando initDate, vehicleId e date nel formato corretto
    const encoder = new TextEncoder()
    const message = encoder.encode(`${initDate}-${vehicleId}-${date}`)

    // Crea una chiave da masterKeyBytes
    const key = await window.crypto.subtle.importKey("raw", masterKeyBytes, { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
    ])

    // Firma il messaggio con la chiave
    const signature = await window.crypto.subtle.sign("HMAC", key, message)

    // Converti la firma in hex
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  } catch (error) {
    console.error("Error generating daily key:", error)
    return null
  }
}

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

  // Stati per il Dialog di calcolo della Daily Key
  const [openDailyKeyDialog, setOpenDailyKeyDialog] = useState(false)
  const [dailyKeyMasterKey, setDailyKeyMasterKey] = useState("")
  const [dailyKeyDate, setDailyKeyDate] = useState(new Date().toISOString().split("T")[0])
  const [calculatedDailyKey, setCalculatedDailyKey] = useState("")
  const [calculatingDailyKey, setCalculatingDailyKey] = useState(false)
  const [dailyKeyError, setDailyKeyError] = useState("")
  const [dailyKeyCopied, setDailyKeyCopied] = useState(false)

  // Carica le credenziali dal localStorage
  useEffect(() => {
    const storedNick = localStorage.getItem("nick")
    const storedVehicleId = localStorage.getItem("vehicleId")
    const storedInitDate = localStorage.getItem("initDate")

    // Simula il caricamento
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

  // Funzione per navigare con effetto
  const handleNavigate = (path) => {
    setLoading(true)
    setTimeout(() => {
      navigate(path)
    }, 500)
  }

  // Apre il dialog per calcolare la Daily Key
  const handleOpenDailyKeyDialog = () => {
    setOpenDailyKeyDialog(true)
    setDailyKeyMasterKey("")
    setCalculatedDailyKey("")
    setDailyKeyError("")
    setDailyKeyCopied(false)
  }

  // Chiude il dialog per calcolare la Daily Key
  const handleCloseDailyKeyDialog = () => {
    setOpenDailyKeyDialog(false)
  }

  // Calcola la Daily Key
  const handleCalculateDailyKey = async () => {
    if (!dailyKeyMasterKey || !vehicleId || !initDate || !dailyKeyDate) {
      setDailyKeyError("Compila tutti i campi per calcolare la Daily Key.")
      return
    }

    setCalculatingDailyKey(true)
    setDailyKeyError("")
    setDailyKeyCopied(false)

    try {
      const dailyKey = await generateDailyKeySHA256(dailyKeyMasterKey, vehicleId, initDate, dailyKeyDate)

      if (dailyKey) {
        setCalculatedDailyKey(dailyKey)
      } else {
        setDailyKeyError("Errore nel calcolo della Daily Key.")
      }
    } catch (error) {
      console.error("Error calculating daily key:", error)
      setDailyKeyError("Errore nel calcolo della Daily Key: " + error.message)
    } finally {
      setCalculatingDailyKey(false)
    }
  }

  // Copia la Daily Key negli appunti
  const handleCopyDailyKey = () => {
    if (calculatedDailyKey) {
      navigator.clipboard.writeText(calculatedDailyKey)
      setDailyKeyCopied(true)
      setTimeout(() => setDailyKeyCopied(false), 2000)
    }
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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Montserrat', sans-serif",
        background: "linear-gradient(135deg, #2a0845 0%, #6441A5 100%)",
      }}
    >
      {/* Static background elements */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          opacity: 0.4,
          background: `
            radial-gradient(circle at 20% 30%, rgba(168, 101, 201, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(168, 101, 201, 0.4) 0%, transparent 40%)
          `,
          overflow: "hidden",
        }}
      >
        {/* Static decorative elements */}
        <Box
          sx={{
            position: "absolute",
            top: "10%",
            left: "10%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(168, 101, 201, 0.1)",
            filter: "blur(60px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "20%",
            right: "15%",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            background: "rgba(168, 101, 201, 0.1)",
            filter: "blur(60px)",
          }}
        />

        {/* Grid pattern overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            zIndex: 0,
          }}
        />
      </Box>

      {/* Static tech badges */}
      <TechBadge sx={{ top: "15%", left: "20%" }}>Blockchain</TechBadge>
      <TechBadge sx={{ top: "25%", right: "15%" }}>IoT</TechBadge>
      <TechBadge sx={{ bottom: "20%", left: "25%" }}>Crypto</TechBadge>
      <TechBadge sx={{ bottom: "30%", right: "20%" }}>Security</TechBadge>

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
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: "#6441A5",
                    width: 60,
                    height: 60,
                    fontSize: 24,
                    fontWeight: "bold",
                    mr: 2,
                  }}
                >
                  {getAvatarLetter()}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "#2a0845" }}>
                  {nick}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <DirectionsCarIcon sx={{ color: "#6441A5", mr: 1 }} />
                  <Typography variant="body2" sx={{ color: "#666" }}>
                    <strong>Vehicle ID:</strong> {vehicleId}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CalendarMonthIcon sx={{ color: "#6441A5", mr: 1 }} />
                  <Typography variant="body2" sx={{ color: "#666" }}>
                    <strong>Data Inizio:</strong> {initDate}
                  </Typography>
                </Box>
              </Box>

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
                Modifica profilo
              </GlassButton>
            </Box>
          </Popover>
        </Box>
      )}

      {/* Contenuto principale */}
      <Fade in={!loading} timeout={1000}>
        <Box sx={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%", px: 2 }}>
          <Box sx={{ position: "relative", display: "inline-block", mb: 6 }}>
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
                maxWidth: "600px",
                mx: "auto",
                textShadow: "0 2px 10px rgba(0,0,0,0.2)",
                position: "relative",
                zIndex: 1,
              }}
            >
              Decentralized Blackbox
            </Typography>
            <GlowingBorder />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: "500",
              color: "rgba(255, 255, 255, 0.8)",
              mb: 4,
              textShadow: "0 2px 5px rgba(0,0,0,0.2)",
            }}
          >
            Scegli la piattaforma per visualizzare i dati
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
              <PlatformCard platform="sui">
                <CardActionArea
                  onClick={() => handleNavigate("/sui")}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    background: "rgba(255, 255, 255, 0.05)",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      bgcolor: "rgba(255,255,255,0.1)",
                      borderRadius: "50%",
                      p: 1,
                    }}
                  >
                    <SecurityIcon sx={{ color: "white" }} />
                  </Box>

                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      height: "40%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "20px",
                    }}
                  >
                    <CardMedia
                      component="img"
                      image="/sui-logo.png"
                      alt="SUI"
                      sx={{
                        width: "auto",
                        maxWidth: "80%",
                        height: "auto",
                        maxHeight: "100%",
                        objectFit: "contain",
                        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                        transition: "transform 0.5s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      }}
                    />
                  </Box>
                  <CardContent>
                    <Typography
                      variant="h4"
                      align="center"
                      sx={{
                        color: "white",
                        fontWeight: 700,
                        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                        letterSpacing: "1px",
                        mb: 1,
                      }}
                    >
                      SUI
                    </Typography>
                    <Divider sx={{ my: 1.5, bgcolor: "rgba(255,255,255,0.2)" }} />

                    <Box sx={{ mt: 2, mb: 3, display: "flex", justifyContent: "center", gap: 1 }}>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          bgcolor: "rgba(255,255,255,0.1)",
                          borderRadius: 2,
                          fontSize: "0.7rem",
                          color: "white",
                        }}
                      >
                        Blockchain
                      </Box>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          bgcolor: "rgba(255,255,255,0.1)",
                          borderRadius: 2,
                          fontSize: "0.7rem",
                          color: "white",
                        }}
                      >
                        Encrypted
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      align="center"
                      sx={{
                        color: "rgba(255, 255, 255, 0.8)",
                        maxWidth: "80%",
                        mx: "auto",
                      }}
                    >
                      Esplora i dati sulla blockchain SUI con visualizzazioni avanzate e decrittazione sicura
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </PlatformCard>
            </Zoom>

            <Zoom in={!loading} style={{ transitionDelay: !loading ? "600ms" : "0ms" }}>
              <PlatformCard platform="iota">
                <CardActionArea
                  onClick={() => handleNavigate("/iota")}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    background: "rgba(255, 255, 255, 0.05)",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      bgcolor: "rgba(255,255,255,0.1)",
                      borderRadius: "50%",
                      p: 1,
                    }}
                  >
                    <SecurityIcon sx={{ color: "white" }} />
                  </Box>

                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      height: "40%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "20px",
                    }}
                  >
                    <CardMedia
                      component="img"
                      image="/iota-logo.png"
                      alt="IOTA"
                      sx={{
                        width: "auto",
                        maxWidth: "80%",
                        height: "auto",
                        maxHeight: "100%",
                        objectFit: "contain",
                        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                        transition: "transform 0.5s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      }}
                    />
                  </Box>
                  <CardContent>
                    <Typography
                      variant="h4"
                      align="center"
                      sx={{
                        color: "white",
                        fontWeight: 700,
                        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                        letterSpacing: "1px",
                        mb: 1,
                      }}
                    >
                      IOTA
                    </Typography>
                    <Divider sx={{ my: 1.5, bgcolor: "rgba(255,255,255,0.2)" }} />

                    <Box sx={{ mt: 2, mb: 3, display: "flex", justifyContent: "center", gap: 1 }}>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          bgcolor: "rgba(255,255,255,0.1)",
                          borderRadius: 2,
                          fontSize: "0.7rem",
                          color: "white",
                        }}
                      >
                        IoT
                      </Box>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          bgcolor: "rgba(255,255,255,0.1)",
                          borderRadius: 2,
                          fontSize: "0.7rem",
                          color: "white",
                        }}
                      >
                        Tangle
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      align="center"
                      sx={{
                        color: "rgba(255, 255, 255, 0.8)",
                        maxWidth: "80%",
                        mx: "auto",
                      }}
                    >
                      Analizza i dati IoT sulla rete IOTA con strumenti di visualizzazione e decrittazione avanzati
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </PlatformCard>
            </Zoom>
          </Box>

          {/* Utility Bar */}
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: "100%",
              background: "rgba(42, 8, 69, 0.8)",
              backdropFilter: "blur(10px)",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "10px 0",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Tooltip title="Informazioni sul progetto">
                <Link to="https://github.com/pyMelo/DecentralizedBlackbox" style={{ textDecoration: "none" }}>
                  <Button
                    startIcon={<InfoIcon />}
                    sx={{
                      color: "white",
                      textTransform: "none",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "20px",
                      padding: "8px 16px",
                      "&:hover": {
                        background: "rgba(255, 255, 255, 0.2)",
                      },
                    }}
                  >
                    Blockchain IoT Security Dashboard v1.0
                  </Button>
                </Link>
              </Tooltip>
              <Tooltip title="Calcola Daily Key">
                <Button
                  startIcon={<CalculateIcon />}
                  onClick={handleOpenDailyKeyDialog}
                  sx={{
                    color: "white",
                    textTransform: "none",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    background: "rgba(100, 65, 165, 0.4)",
                    borderRadius: "20px",
                    padding: "8px 16px",
                    "&:hover": {
                      background: "rgba(100, 65, 165, 0.6)",
                    },
                  }}
                >
                  Calcola Daily Key
                </Button>
              </Tooltip>
            </Box>
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
            <StyledDialogTitle>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <AccountCircleIcon sx={{ mr: 1 }} />
                Accedi al tuo profilo
              </Box>
            </StyledDialogTitle>
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
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                overflow: "hidden",
              },
            }}
          >
            <StyledDialogTitle>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <EditIcon sx={{ mr: 1 }} />
                Modifica le tue credenziali
              </Box>
            </StyledDialogTitle>
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
          {/* Dialog per calcolare la Daily Key */}
          <Dialog
            open={openDailyKeyDialog}
            onClose={handleCloseDailyKeyDialog}
            PaperProps={{
              sx: {
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                overflow: "hidden",
                width: "100%",
                maxWidth: "500px",
              },
            }}
          >
            <StyledDialogTitle>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <KeyIcon sx={{ mr: 1 }} />
                Calcola Daily Key
              </Box>
            </StyledDialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Box sx={{ my: 1 }}>
                <TextField
                  margin="dense"
                  label="Master Key (hex)"
                  fullWidth
                  value={dailyKeyMasterKey}
                  onChange={(e) => setDailyKeyMasterKey(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />
                {/* Imposta in sola lettura questi campi per evitare discrepanze */}
                <TextField
                  margin="dense"
                  label="Vehicle ID"
                  fullWidth
                  value={vehicleId}
                  disabled
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
                  disabled
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />
                <TextField
                  margin="dense"
                  label="Data per Daily Key"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={dailyKeyDate}
                  onChange={(e) => setDailyKeyDate(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: "12px" },
                  }}
                />

                {calculatedDailyKey && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: "rgba(100, 65, 165, 0.1)", borderRadius: "12px" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Daily Key calcolata:
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={calculatedDailyKey}
                        InputProps={{
                          readOnly: true,
                          sx: {
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                            borderRadius: "12px",
                            bgcolor: "white",
                          },
                        }}
                        size="small"
                      />
                      <Tooltip title={dailyKeyCopied ? "Copiato!" : "Copia negli appunti"}>
                        <IconButton
                          onClick={handleCopyDailyKey}
                          color="primary"
                          sx={{
                            bgcolor: dailyKeyCopied ? "rgba(100, 65, 165, 0.2)" : "transparent",
                            transition: "background-color 0.3s ease",
                          }}
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}

                {dailyKeyError && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: "12px" }}>
                    {dailyKeyError}
                  </Alert>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <GlassButton onClick={handleCloseDailyKeyDialog} variant="outlined" sx={{ mr: 1 }}>
                Chiudi
              </GlassButton>
              <GlassButton
                onClick={handleCalculateDailyKey}
                variant="contained"
                disabled={calculatingDailyKey}
                startIcon={calculatingDailyKey ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
                sx={{
                  background: "linear-gradient(45deg, #2a0845 0%, #6441A5 100%)",
                  color: "white",
                }}
              >
                {calculatingDailyKey ? "Calcolando..." : "Calcola"}
              </GlassButton>
            </DialogActions>
          </Dialog>
        </Box>
      </Fade>
    </Box>
  )
}

export default Home
