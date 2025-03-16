"use client"

// src/components/IOTA.js
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  IconButton,
  Chip,
  Divider,
  Tooltip,
  CircularProgress,
  Fade,
  useMediaQuery,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Grid,
  Drawer,
  AppBar,
  Toolbar,
} from "@mui/material"
import { Contract, JsonRpcProvider } from "ethers"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"
import LockIcon from "@mui/icons-material/Lock"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import RefreshIcon from "@mui/icons-material/Refresh"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import HomeIcon from "@mui/icons-material/Home"
import SettingsIcon from "@mui/icons-material/Settings"
import InfoIcon from "@mui/icons-material/Info"
import MenuIcon from "@mui/icons-material/Menu"
import CloseIcon from "@mui/icons-material/Close"
import { styled } from "@mui/system"
import { useNavigate } from "react-router-dom"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"

//
// ----- UTILITIES -----
//

const getEpochUTC = (dateStr) => {
  const utcString = `${dateStr}T00:00:00Z`
  return Math.floor(new Date(utcString).getTime() / 1000)
}

const hexStringToBytes = (hexString) => {
  const clean = hexString.replace(/\s+/g, "")
  const length = clean.length / 2
  const result = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    result[i] = Number.parseInt(clean.substr(i * 2, 2), 16)
  }
  return result
}

const asciiToBytes = (str) => new TextEncoder().encode(str)

const concatUint8Arrays = (...arrays) => {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  arrays.forEach((arr) => {
    result.set(arr, offset)
    offset += arr.length
  })
  return result
}

const sha256 = async (data) => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return new Uint8Array(hashBuffer)
}

const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

const epochToBytesBE = (epoch) => {
  const bytes = new Uint8Array(8)
  for (let i = 7; i >= 0; i--) {
    bytes[i] = epoch % 256
    epoch = Math.floor(epoch / 256)
  }
  return bytes
}

//
// ----- DAILY KEY GENERATION -----
//

const generateDailyKeySHA256 = async (masterKeyHex, vehicleId, initDate, fetchDate) => {
  masterKeyHex = masterKeyHex.trim().toLowerCase()
  vehicleId = vehicleId.trim()

  const initEpoch = getEpochUTC(initDate)
  const fetchEpoch = getEpochUTC(fetchDate)
  const diffDays = Math.max(0, Math.floor((fetchEpoch - initEpoch) / 86400))

  const masterKeyBytes = hexStringToBytes(masterKeyHex)
  const vehicleIdBytes = asciiToBytes(vehicleId)
  const initEpochBytes = epochToBytesBE(initEpoch)

  const data = concatUint8Arrays(masterKeyBytes, vehicleIdBytes, initEpochBytes)
  const hash = await sha256(data)
  let dailyKey = hash.slice(0, 16)

  for (let i = 0; i < diffDays; i++) {
    const nextEpoch = initEpoch + (i + 1) * 86400
    const nextEpochBytes = epochToBytesBE(nextEpoch)
    const iterationData = concatUint8Arrays(dailyKey, vehicleIdBytes, nextEpochBytes)
    const iterationHash = await sha256(iterationData)
    dailyKey = iterationHash.slice(0, 16)
  }
  return bytesToHex(dailyKey)
}

//
// ----- PAYLOAD DECODING -----
//

const decryptEncryptedBlock = async (encryptedBytes, effectiveIV, dailyKeyHex) => {
  const keyBuffer = hexStringToBytes(dailyKeyHex)
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-CTR" }, false, ["decrypt"])
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CTR", counter: effectiveIV, length: 128 },
    cryptoKey,
    encryptedBytes,
  )
  return new Uint8Array(decryptedBuffer)
}

const decodePayload = async (hex, dailyKeyHex, isClear = false) => {
  const cleanHex = hex.replace(/\s+/g, "")
  const bytes = []
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(Number.parseInt(cleanHex.substr(i, 2), 16))
  }

  // Decodifica del blocco in chiaro
  const effectiveIV = new Uint8Array(bytes.slice(0, 16))
  const clearBlockLength = bytes[16] // atteso 6
  const sensorMarker = bytes[17] // atteso 0x01
  const temperature = bytes[18]
  const gyroMarker = bytes[19] // atteso 0x03

  // Giroscopio
  const gyroRawX = bytes[20]
  const gyroRawY = bytes[21]
  const gyroRawZ = bytes[22]
  const toSigned8Bit = (byte) => (byte > 127 ? byte - 256 : byte)
  const gx = toSigned8Bit(gyroRawX) / 100
  const gy = toSigned8Bit(gyroRawY) / 100
  const gz = toSigned8Bit(gyroRawZ) / 100

  // Decodifica del blocco cifrato
  const encryptedBlockLength = bytes[23] // atteso 5
  const encryptedData = new Uint8Array(bytes.slice(24, 24 + encryptedBlockLength))
  let decryptedData = null

  if (!isClear) {
    const decryptedRaw = await decryptEncryptedBlock(encryptedData, effectiveIV, dailyKeyHex)
    // Struttura attesa per i dati cifrati:
    // Byte[0]: lunghezza (5)
    // Byte[1]: marker accelerometro (0x04)
    // Byte[2]: valore accelerometro (uint8_t)
    // Byte[3]: marker GPS (0x05)
    // Byte[4]: latitudine
    // Byte[5]: longitudine
    decryptedData = {
      acceleration: decryptedRaw[1],
      latitude: decryptedRaw[3],
      longitude: decryptedRaw[4],
    }
    console.log("Decrypted payload:", decryptedData)
  }

  return {
    clearBlock: {
      clearBlockLength,
      sensorMarker,
      temperature,
      gyroMarker,
      gx,
      gy,
      gz,
    },
    encryptedBlock: {
      encryptedBlockLength,
      encryptedData,
      decryptedData,
    },
    computedTimestamp: 0,
    effectiveIV,
  }
}

//
// ----- STYLED COMPONENTS -----
//

const GlassCard = styled(Card)(({ theme, darkMode }) => ({
  background: darkMode ? "rgba(30, 30, 40, 0.7)" : "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
  boxShadow: darkMode ? "0 8px 32px rgba(0, 0, 0, 0.3)" : "0 8px 32px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
  overflow: "hidden",
  height: "100%",
}))

const StyledButton = styled(Button)(({ theme, darkMode }) => ({
  borderRadius: "12px",
  padding: "10px 20px",
  fontWeight: 600,
  textTransform: "none",
  boxShadow: darkMode ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "0 4px 12px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: darkMode ? "0 6px 16px rgba(0, 0, 0, 0.4)" : "0 6px 16px rgba(0, 0, 0, 0.2)",
  },
}))

const StyledTextField = styled(TextField)(({ theme, darkMode }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    background: darkMode ? "rgba(30, 30, 40, 0.5)" : "rgba(255, 255, 255, 0.5)",
    "& fieldset": {
      borderColor: darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
    },
    "&:hover fieldset": {
      borderColor: darkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#6441A5",
    },
  },
  "& .MuiInputLabel-root": {
    color: darkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
  },
  "& .MuiInputBase-input": {
    color: darkMode ? "white" : "black",
  },
}))

const StyledChip = styled(Chip)(({ theme, darkMode, active }) => ({
  borderRadius: "20px",
  fontWeight: 600,
  background: active
    ? darkMode
      ? "rgba(100, 65, 165, 0.8)"
      : "rgba(100, 65, 165, 0.9)"
    : darkMode
      ? "rgba(30, 30, 40, 0.5)"
      : "rgba(255, 255, 255, 0.5)",
  color: active ? "white" : darkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
  border: active
    ? "1px solid rgba(255, 255, 255, 0.3)"
    : darkMode
      ? "1px solid rgba(255, 255, 255, 0.1)"
      : "1px solid rgba(0, 0, 0, 0.1)",
  boxShadow: active ? "0 4px 12px rgba(100, 65, 165, 0.3)" : "none",
  transition: "all 0.3s ease",
  "&:hover": {
    background: active
      ? darkMode
        ? "rgba(100, 65, 165, 0.9)"
        : "rgba(100, 65, 165, 1)"
      : darkMode
        ? "rgba(50, 50, 60, 0.7)"
        : "rgba(240, 240, 240, 0.9)",
  },
}))

const DataCard = styled(Paper)(({ theme, darkMode }) => ({
  padding: "16px",
  borderRadius: "16px",
  background: darkMode ? "rgba(30, 30, 40, 0.7)" : "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
  boxShadow: darkMode ? "0 8px 32px rgba(0, 0, 0, 0.3)" : "0 8px 32px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
  marginBottom: "16px",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: darkMode ? "0 10px 40px rgba(0, 0, 0, 0.4)" : "0 10px 40px rgba(0, 0, 0, 0.15)",
  },
}))

//
// ----- COMPONENTE REACT -----
//

const IOTA = () => {
  const navigate = useNavigate()
  const isMobile = useMediaQuery("(max-width:768px)")
  const [darkMode, setDarkMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const [mode, setMode] = useState("clear")
  const [masterKey, setMasterKey] = useState("")
  const [contractAddress, setContractAddress] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Carica automaticamente Vehicle ID e Data di Inizializzazione dal profilo (localStorage)
  const [vehicleId, setVehicleId] = useState("")
  const [initDate, setInitDate] = useState("")
  useEffect(() => {
    const savedVehicleId = localStorage.getItem("vehicleId")
    const savedInitDate = localStorage.getItem("initDate")
    if (savedVehicleId && savedInitDate) {
      setVehicleId(savedVehicleId)
      setInitDate(savedInitDate)
    }

    // Check user preference for dark mode
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
    setDarkMode(prefersDarkMode)
  }, [])

  const getDateKey = (dateStr) => getEpochUTC(dateStr)

  // Fetch per dati in chiaro (senza decriptazione)
  const handleFetchClearData = async () => {
    if (!contractAddress) {
      setError("Compila l'indirizzo contratto.")
      return
    }
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const dateKey = getDateKey(selectedDate)
      const provider = new JsonRpcProvider("https://json-rpc.evm.testnet.iotaledger.net")
      const abi = [
        "function getAllSensorBatchesForDay(uint256 dateKey) external view returns (tuple(uint256 timestamp, string hexData)[])",
      ]
      const contract = new Contract(contractAddress, abi, provider)
      const result = await contract.getAllSensorBatchesForDay(dateKey)

      if (result.length > 0) {
        const decodedPayloads = await Promise.all(
          result.map(async (batch) => {
            const decoded = await decodePayload(batch.hexData, "", true)
            return {
              ...decoded,
              computedTimestamp: Number.parseInt(batch.timestamp),
            }
          }),
        )
        setData(decodedPayloads)
        setSuccess(`Recuperati ${result.length} record di dati in chiaro.`)
      } else {
        setData([])
        setError("Nessuna transazione trovata per il giorno selezionato.")
      }
      setMode("clear")
    } catch (err) {
      console.error(err)
      setError("Errore nel recupero dei dati: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch per dati decriptati
  const handleFetchData = async () => {
    // Verifica che tutti i campi necessari siano compilati:
    // contractAddress, selectedDate, masterKey, vehicleId e initDate.
    if (!contractAddress || !selectedDate || !masterKey || !vehicleId || !initDate) {
      setError("Compila tutti i campi necessari per i dati nascosti.")
      return
    }
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const dailyKeyHex = await generateDailyKeySHA256(masterKey, vehicleId, initDate, selectedDate)
      console.log("Daily Key:", dailyKeyHex)

      const dateKey = getDateKey(selectedDate)
      const provider = new JsonRpcProvider("https://json-rpc.evm.testnet.iotaledger.net")
      const abi = [
        "function getAllSensorBatchesForDay(uint256 dateKey) external view returns (tuple(uint256 timestamp, string hexData)[])",
      ]
      const contract = new Contract(contractAddress, abi, provider)
      const result = await contract.getAllSensorBatchesForDay(dateKey)

      if (result.length > 0) {
        const decodedPayloads = await Promise.all(
          result.map(async (batch) => {
            const decoded = await decodePayload(batch.hexData, dailyKeyHex, false)
            return {
              ...decoded,
              computedTimestamp: Number.parseInt(batch.timestamp),
            }
          }),
        )
        setData(decodedPayloads)
        setSuccess(`Recuperati e decriptati ${result.length} record di dati.`)
        setMode("decrypted")
      } else {
        setData([])
        setError("Nessuna transazione trovata per il giorno selezionato.")
      }
    } catch (err) {
      console.error(err)
      setError("Errore nel recupero dei dati: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Dati per i grafici in chiaro
  const clearChartData = data.map((item) => ({
    time: new Date(item.computedTimestamp * 1000).toLocaleTimeString(),
    value: item.clearBlock.temperature,
  }))
  const gyroChartData = data.map((item) => ({
    time: new Date(item.computedTimestamp * 1000).toLocaleTimeString(),
    gx: item.clearBlock.gx,
    gy: item.clearBlock.gy,
    gz: item.clearBlock.gz,
  }))

  // Dati per i grafici decriptati
  const hiddenChartData = data.map((item) => ({
    time: new Date(item.computedTimestamp * 1000).toLocaleTimeString(),
    value: item.encryptedBlock.decryptedData ? item.encryptedBlock.decryptedData.acceleration : 0,
  }))
  const gpsChartData = data.map((item) => ({
    time: new Date(item.computedTimestamp * 1000).toLocaleTimeString(),
    latitude: item.encryptedBlock.decryptedData ? item.encryptedBlock.decryptedData.latitude : 0,
    longitude: item.encryptedBlock.decryptedData ? item.encryptedBlock.decryptedData.longitude : 0,
  }))

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  const toggleDrawer = (open) => (event) => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return
    }
    setDrawerOpen(open)
  }

  const renderDrawerContent = () => (
    <Box
      sx={{
        width: 250,
        height: "100%",
        background: darkMode ? "#1E1E28" : "#f5f5f5",
        color: darkMode ? "white" : "black",
        p: 2,
      }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Menu
        </Typography>
        <IconButton onClick={toggleDrawer(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Button
          startIcon={<HomeIcon />}
          onClick={() => navigate("/")}
          sx={{ justifyContent: "flex-start", textTransform: "none", fontWeight: 500 }}
        >
          Home
        </Button>
        <Button
          startIcon={<SettingsIcon />}
          sx={{ justifyContent: "flex-start", textTransform: "none", fontWeight: 500 }}
        >
          Impostazioni
        </Button>
        <Button startIcon={<InfoIcon />} sx={{ justifyContent: "flex-start", textTransform: "none", fontWeight: 500 }}>
          Informazioni
        </Button>
      </Box>
      <Box sx={{ position: "absolute", bottom: 20, left: 0, width: "100%", px: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={toggleDarkMode}
              icon={<LightModeIcon />}
              checkedIcon={<DarkModeIcon />}
            />
          }
          label={darkMode ? "Modalità Chiara" : "Modalità Scura"}
        />
      </Box>
    </Box>
  )

  return (
    <Box
      sx={{
        width: "100vw",
        minHeight: "100vh",
        overflowX: "hidden",
        background: darkMode
          ? "linear-gradient(135deg, #121212 0%, #1E1E28 100%)"
          : "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
        fontFamily: "'Montserrat', sans-serif",
        color: darkMode ? "white" : "black",
        transition: "background 0.3s ease",
      }}
    >
      {/* App Bar */}
      <AppBar
        position="sticky"
        sx={{
          background: darkMode ? "rgba(30, 30, 40, 0.8)" : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(10px)",
          boxShadow: darkMode ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
            sx={{ mr: 2, color: darkMode ? "white" : "black" }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              color: darkMode ? "white" : "black",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <img
              src="/iota-logo.png"
              alt="IOTA"
              style={{
                height: "30px",
                width: "auto",
                filter: darkMode ? "brightness(1.2)" : "none",
              }}
            />
            IOTA Dashboard
          </Typography>
          <Tooltip title={darkMode ? "Modalità Chiara" : "Modalità Scura"}>
            <IconButton onClick={toggleDarkMode} sx={{ color: darkMode ? "white" : "black" }}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Torna alla Home">
            <IconButton onClick={() => navigate("/")} sx={{ color: darkMode ? "white" : "black" }}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        {renderDrawerContent()}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Form Section */}
          <Grid item xs={12}>
            <GlassCard darkMode={darkMode}>
              <CardContent>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    mb: 3,
                    color: darkMode ? "white" : "black",
                  }}
                >
                  Configurazione
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <StyledTextField
                      fullWidth
                      variant="outlined"
                      label="Indirizzo Contratto"
                      placeholder="Inserisci indirizzo contratto"
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                      darkMode={darkMode}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <StyledTextField
                        fullWidth
                        variant="outlined"
                        label="Data di Fetch (Payload)"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        darkMode={darkMode}
                      />
                      <Tooltip title="Seleziona Data">
                        <IconButton sx={{ color: darkMode ? "white" : "black" }}>
                          <CalendarTodayIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <StyledTextField
                      fullWidth
                      variant="outlined"
                      label="Master Key (hex)"
                      placeholder="Inserisci Master Key per decrittare i dati nascosti"
                      value={masterKey}
                      onChange={(e) => setMasterKey(e.target.value)}
                      darkMode={darkMode}
                      InputProps={{
                        endAdornment: (
                          <Tooltip title="Chiave per decrittazione">
                            <IconButton edge="end" sx={{ color: darkMode ? "white" : "black" }}>
                              <LockIcon />
                            </IconButton>
                          </Tooltip>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                      <StyledButton
                        variant="contained"
                        fullWidth
                        onClick={handleFetchClearData}
                        disabled={loading || !contractAddress}
                        startIcon={<RefreshIcon />}
                        darkMode={darkMode}
                        sx={{
                          background: darkMode ? "#6441A5" : "#6441A5",
                          color: "white",
                        }}
                      >
                        {loading ? <CircularProgress size={24} color="inherit" /> : "Mostra Dati in Chiaro"}
                      </StyledButton>
                      <StyledButton
                        variant="contained"
                        fullWidth
                        onClick={handleFetchData}
                        disabled={!selectedDate || !masterKey || !vehicleId || !initDate || loading || !contractAddress}
                        startIcon={<LockOpenIcon />}
                        darkMode={darkMode}
                        sx={{
                          background: darkMode ? "#6441A5" : "#6441A5",
                          color: "white",
                        }}
                      >
                        {loading ? <CircularProgress size={24} color="inherit" /> : "Mostra Dati Nascosti"}
                      </StyledButton>
                    </Box>
                  </Grid>
                </Grid>

                {error && (
                  <Fade in={!!error}>
                    <Alert
                      severity="error"
                      sx={{
                        mt: 2,
                        borderRadius: "12px",
                        "& .MuiAlert-icon": {
                          color: darkMode ? "#ff8a80" : undefined,
                        },
                      }}
                    >
                      {error}
                    </Alert>
                  </Fade>
                )}

                {success && (
                  <Fade in={!!success}>
                    <Alert
                      severity="success"
                      sx={{
                        mt: 2,
                        borderRadius: "12px",
                        "& .MuiAlert-icon": {
                          color: darkMode ? "#b9f6ca" : undefined,
                        },
                      }}
                    >
                      {success}
                    </Alert>
                  </Fade>
                )}
              </CardContent>
            </GlassCard>
          </Grid>

          {/* Data Visualization Section */}
          {data.length > 0 && (
            <>
              <Grid item xs={12}>
                <Box sx={{ mt: 2, mb: 3, display: "flex", justifyContent: "center" }}>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <StyledChip
                      label="Temperatura"
                      clickable
                      onClick={() => setActiveTab(0)}
                      active={activeTab === 0}
                      darkMode={darkMode}
                    />
                    <StyledChip
                      label="Giroscopio"
                      clickable
                      onClick={() => setActiveTab(1)}
                      active={activeTab === 1}
                      darkMode={darkMode}
                    />
                    {mode === "decrypted" && (
                      <>
                        <StyledChip
                          label="Accelerometro"
                          clickable
                          onClick={() => setActiveTab(2)}
                          active={activeTab === 2}
                          darkMode={darkMode}
                        />
                        <StyledChip
                          label="GPS"
                          clickable
                          onClick={() => setActiveTab(3)}
                          active={activeTab === 3}
                          darkMode={darkMode}
                        />
                      </>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Chart Panels */}
              <Grid item xs={12}>
                <Fade in={activeTab === 0} timeout={500}>
                  <div style={{ display: activeTab === 0 ? "block" : "none", height: "400px" }}>
                    <GlassCard darkMode={darkMode}>
                      <CardContent>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 2,
                            textAlign: "center",
                            fontWeight: 600,
                            color: darkMode ? "white" : "black",
                          }}
                        >
                          Grafico Temperatura
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={clearChartData}>
                            <defs>
                              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6441A5" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#6441A5" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                            />
                            <XAxis dataKey="time" stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                            <YAxis stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                            <RechartsTooltip
                              contentStyle={{
                                background: darkMode ? "rgba(30,30,40,0.8)" : "rgba(255,255,255,0.8)",
                                border: "none",
                                borderRadius: "8px",
                                color: darkMode ? "white" : "black",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#6441A5"
                              fillOpacity={1}
                              fill="url(#colorTemp)"
                              name="Temperatura"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </GlassCard>
                  </div>
                </Fade>

                <Fade in={activeTab === 1} timeout={500}>
                  <div style={{ display: activeTab === 1 ? "block" : "none", height: "400px" }}>
                    <GlassCard darkMode={darkMode}>
                      <CardContent>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 2,
                            textAlign: "center",
                            fontWeight: 600,
                            color: darkMode ? "white" : "black",
                          }}
                        >
                          Grafico Giroscopio
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={gyroChartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                            />
                            <XAxis dataKey="time" stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                            <YAxis stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                            <RechartsTooltip
                              contentStyle={{
                                background: darkMode ? "rgba(30,30,40,0.8)" : "rgba(255,255,255,0.8)",
                                border: "none",
                                borderRadius: "8px",
                                color: darkMode ? "white" : "black",
                              }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="gx" stroke="#8884d8" name="Giroscopio X" />
                            <Line type="monotone" dataKey="gy" stroke="#82ca9d" name="Giroscopio Y" />
                            <Line type="monotone" dataKey="gz" stroke="#ffc658" name="Giroscopio Z" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </GlassCard>
                  </div>
                </Fade>

                {mode === "decrypted" && (
                  <>
                    <Fade in={activeTab === 2} timeout={500}>
                      <div style={{ display: activeTab === 2 ? "block" : "none", height: "400px" }}>
                        <GlassCard darkMode={darkMode}>
                          <CardContent>
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 2,
                                textAlign: "center",
                                fontWeight: 600,
                                color: darkMode ? "white" : "black",
                              }}
                            >
                              Grafico Accelerometro
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                              <AreaChart data={hiddenChartData}>
                                <defs>
                                  <linearGradient id="colorAccel" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#A865C9" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#A865C9" stopOpacity={0.1} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                                />
                                <XAxis dataKey="time" stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                                <YAxis stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                                <RechartsTooltip
                                  contentStyle={{
                                    background: darkMode ? "rgba(30,30,40,0.8)" : "rgba(255,255,255,0.8)",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: darkMode ? "white" : "black",
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke="#A865C9"
                                  fillOpacity={1}
                                  fill="url(#colorAccel)"
                                  name="Accelerometro"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </GlassCard>
                      </div>
                    </Fade>

                    <Fade in={activeTab === 3} timeout={500}>
                      <div style={{ display: activeTab === 3 ? "block" : "none", height: "400px" }}>
                        <GlassCard darkMode={darkMode}>
                          <CardContent>
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 2,
                                textAlign: "center",
                                fontWeight: 600,
                                color: darkMode ? "white" : "black",
                              }}
                            >
                              Grafico GPS
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={gpsChartData}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                                />
                                <XAxis dataKey="time" stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                                <YAxis stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} />
                                <RechartsTooltip
                                  contentStyle={{
                                    background: darkMode ? "rgba(30,30,40,0.8)" : "rgba(255,255,255,0.8)",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: darkMode ? "white" : "black",
                                  }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="latitude" stroke="#82ca9d" name="Latitudine" />
                                <Line type="monotone" dataKey="longitude" stroke="#ffc658" name="Longitudine" />
                              </LineChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </GlassCard>
                      </div>
                    </Fade>
                  </>
                )}
              </Grid>

              {/* Data Details Section */}
              <Grid item xs={12}>
                <GlassCard darkMode={darkMode}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        fontWeight: 600,
                        color: darkMode ? "white" : "black",
                      }}
                    >
                      Dettagli Payload
                    </Typography>
                    <Box sx={{ maxHeight: "300px", overflowY: "auto", pr: 1 }}>
                      {data.map((item, index) => (
                        <DataCard key={index} darkMode={darkMode} sx={{ mb: 2 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, color: darkMode ? "#A865C9" : "#6441A5" }}
                              >
                                Timestamp
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ mb: 1, color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
                              >
                                {new Date(item.computedTimestamp * 1000).toLocaleString()}
                              </Typography>

                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, color: darkMode ? "#A865C9" : "#6441A5" }}
                              >
                                Temperatura
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ mb: 1, color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
                              >
                                {item.clearBlock.temperature}°C
                              </Typography>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, color: darkMode ? "#A865C9" : "#6441A5" }}
                              >
                                Giroscopio
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ mb: 1, color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
                              >
                                X: {item.clearBlock.gx.toFixed(2)}, Y: {item.clearBlock.gy.toFixed(2)}, Z:{" "}
                                {item.clearBlock.gz.toFixed(2)}
                              </Typography>

                              {mode === "decrypted" && item.encryptedBlock.decryptedData && (
                                <>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 600, color: darkMode ? "#A865C9" : "#6441A5" }}
                                  >
                                    Dati Decriptati
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
                                  >
                                    Accelerometro: {item.encryptedBlock.decryptedData.acceleration}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
                                  >
                                    GPS: Lat {item.encryptedBlock.decryptedData.latitude}, Long{" "}
                                    {item.encryptedBlock.decryptedData.longitude}
                                  </Typography>
                                </>
                              )}
                            </Grid>
                          </Grid>
                        </DataCard>
                      ))}
                    </Box>
                  </CardContent>
                </GlassCard>
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    </Box>
  )
}

export default IOTA

