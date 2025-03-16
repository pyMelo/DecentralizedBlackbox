"use client"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Paper,
  Alert,
  IconButton,
  Chip,
  Divider,
  Tooltip,
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
import { SuiClient } from "@mysten/sui/client"
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

const sha256 = async (data) => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return new Uint8Array(hashBuffer)
}

const generateDailyKeySHA256 = async (masterKeyHex, vehicleId, initDate, fetchDate) => {
  // Usa variabili locali per non modificare i parametri
  const mk = masterKeyHex.trim().toLowerCase();
  const vid = vehicleId.trim();

  const initEpoch = getEpochUTC(initDate);
  const fetchEpoch = getEpochUTC(fetchDate);
  const diffDays = Math.max(0, Math.floor((fetchEpoch - initEpoch) / 86400));

  console.log("Initial Epoch:", initEpoch);
  console.log("Fetch Epoch:", fetchEpoch);
  console.log("Diff Days:", diffDays);

  const masterKeyBytes = hexStringToBytes(mk);
  const vehicleIdBytes = new TextEncoder().encode(vid);

  // Prepara l'array di 8 byte per initEpoch
  let initEpochVal = initEpoch;
  const initEpochBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    initEpochBytes[i] = initEpochVal % 256;
    initEpochVal = Math.floor(initEpochVal / 256);
  }

  console.log("Master Key Bytes:", Array.from(masterKeyBytes).map(b => b.toString(16).padStart(2, "0")).join(""));
  console.log("Vehicle ID Bytes:", Array.from(vehicleIdBytes).map(b => b.toString(16).padStart(2, "0")).join(""));
  console.log("Init Epoch Bytes:", Array.from(initEpochBytes).map(b => b.toString(16).padStart(2, "0")).join(""));

  // Crea l'array di dati da hashare
  const data = new Uint8Array([...masterKeyBytes, ...vehicleIdBytes, ...initEpochBytes]);
  console.log("Data to hash for Day 1:", Array.from(data).map(b => b.toString(16).padStart(2, "0")).join(""));
  
  const hash = await sha256(data);
  let dailyKey = hash.slice(0, 16);

  console.log(`Timestamp used for Daily Key 1: ${initEpoch}`);
  console.log(
    `Daily Key 1: ${Array.from(dailyKey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`,
  );

  // Genera le successive Daily Key
  for (let i = 0; i < diffDays; i++) {
    const nextEpoch = initEpoch + (i + 1) * 86400;
    let nextEpochVal = nextEpoch;
    const nextEpochBytes = new Uint8Array(8);
    for (let j = 7; j >= 0; j--) {
      nextEpochBytes[j] = nextEpochVal % 256;
      nextEpochVal = Math.floor(nextEpochVal / 256);
    }
    
    console.log(`Next Epoch Bytes for Day ${i+2}:`, Array.from(nextEpochBytes).map(b => b.toString(16).padStart(2, "0")).join(""));
    
    const iterationData = new Uint8Array([...dailyKey, ...vehicleIdBytes, ...nextEpochBytes]);
    console.log(`Data to hash for Day ${i+2}:`, Array.from(iterationData).map(b => b.toString(16).padStart(2, "0")).join(""));
    
    const iterationHash = await sha256(iterationData);
    dailyKey = iterationHash.slice(0, 16);
    console.log(`Timestamp used for Daily Key ${i + 2}: ${nextEpoch}`);
    console.log(
      `Daily Key ${i + 2}: ${Array.from(dailyKey)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`,
    );
  }

  return Array.from(dailyKey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

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
// ----- SUI Component -----
//

const SUI = () => {
  const navigate = useNavigate()
  const isMobile = useMediaQuery("(max-width:768px)")
  const [darkMode, setDarkMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const [packageId, setPackageId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [masterKey, setMasterKey] = useState("")
  const [sensorData, setSensorData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  // showGroup2: grafici di accelerometro e GPS (visibili dopo inserimento master key)
  const [showGroup2, setShowGroup2] = useState(false)

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

  const handleFetchSensorData = async () => {
    if (!packageId || !date) {
      setError("Inserisci il Package ID e la Data.")
      return
    }
  
    setLoading(true)
    setError("")
    setSuccess("")
  
    const client = new SuiClient({ url: "https://fullnode.devnet.sui.io:443" })
  
    try {
      const txResponse = await client.queryTransactionBlocks({
        filter: { InputObject: packageId },
        limit: 100,
        options: { showInput: true, showEffects: true, showEvents: true },
      })
  
      const transactions = txResponse.data || []
  
      // Usa la data selezionata invece della data attuale
      const selectedDate = new Date(date) 
      const selectedStart = selectedDate.setHours(0, 0, 0, 0)
      const selectedEnd = selectedDate.setHours(23, 59, 59, 999)
  
      // Filtra le transazioni in base alla data selezionata
      const filteredTx = transactions.filter((tx) => {
        const ts = Number(tx.timestampMs)
        return ts >= selectedStart && ts <= selectedEnd
      })
  
      if (filteredTx.length === 0) {
        setError(`Nessuna transazione trovata per il ${date}.`)
        setSensorData([])
        return
      }
  
      // Estrarre i dati dai payload come prima
      const sensorRecords = filteredTx.map((tx) => {
        const hexData = tx.transaction?.data?.transaction?.inputs[2]?.value || ""
        const rawBytes = hexStringToBytes(hexData)
  
        if (rawBytes.length < 29) return null // Controlla che il payload sia valido
  
        const temperature = rawBytes[18]
        const gyroX = (rawBytes[20] > 127 ? rawBytes[20] - 256 : rawBytes[20]) / 100
        const gyroY = (rawBytes[21] > 127 ? rawBytes[21] - 256 : rawBytes[21]) / 100
        const gyroZ = (rawBytes[22] > 127 ? rawBytes[22] - 256 : rawBytes[22]) / 100
        const accel = rawBytes[25]
        const gpsLat = rawBytes[27]
        const gpsLon = rawBytes[28]
  
        return {
          time: new Date(Number(tx.timestampMs)).toLocaleTimeString(),
          timestamp: Number(tx.timestampMs) / 1000,
          temperature,
          gyroX,
          gyroY,
          gyroZ,
          accel,
          gpsLat,
          gpsLon,
          rawData: {
            effectiveIV: rawBytes.slice(0, 16),
            clearBlock: {
              clearBlockLength: rawBytes[16],
              sensorMarker: rawBytes[17],
              temperature,
              gyroMarker: rawBytes[19],
              gx: gyroX,
              gy: gyroY,
              gz: gyroZ,
            },
            encryptedBlock: {
              encryptedBlockLength: rawBytes[23],
              encryptedData: rawBytes.slice(24, 24 + rawBytes[23]),
              decryptedData: null,
            },
          },
        }
      }).filter(record => record !== null) 
  
      setSensorData(sensorRecords)
      setShowGroup2(false)
      setSuccess(`Recuperati ${sensorRecords.length} record di dati.`)
      console.log("Dati ottenuti:", sensorRecords)
    } catch (error) {
      console.error("Errore nel recupero dei dati:", error)
      setError("Errore nel recupero dei dati: " + error.message)
    } finally {
      setLoading(false)
    }
  }
  

  const handleDecryptData = async () => {
    if (!masterKey || !vehicleId || !initDate) {
      setError("Inserisci la Master Key, Vehicle ID e Data di Inizio per decrittare i dati.")
      return
    }
  
    setLoading(true)
    setError("")
  
    try {
      const dailyKey = await generateDailyKeySHA256(masterKey, vehicleId, initDate, date)
      console.log("Computed Daily Key:", dailyKey)
  
      const decryptedSensorData = await Promise.all(
        sensorData.map(async (record) => {
          const keyBuffer = hexStringToBytes(dailyKey)
          const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyBuffer,
            { name: "AES-CTR" },
            false,
            ["decrypt"]
          )
  
          const encryptedData = record.rawData.encryptedBlock.encryptedData
          const effectiveIV = record.rawData.effectiveIV // IV from the payload
  
          try {
            const decryptedBuffer = await crypto.subtle.decrypt(
              { name: "AES-CTR", counter: effectiveIV, length: 128 },
              cryptoKey,
              encryptedData
            )
            
            const decryptedBytes = new Uint8Array(decryptedBuffer)
            
            // Log del payload decifrato in hex per debug
            console.log("Decrypted Bytes:", Array.from(decryptedBytes).map(b => b.toString(16).padStart(2, "0")).join(""))
            
            // Analisi del payload decifrato
            // Consideriamo un formato di payload decifrato come:
            // [marker_accel (1 byte), acceleration (1 byte), marker_gps (1 byte), latitude (1 byte), longitude (1 byte)]
            
            // Cerchiamo marker 0x04 per accelerometro
            let acceleration = null;
            let latitude = null;
            let longitude = null;
            
            try {
              console.log("Encrypted Data (Before Decryption):", Array.from(encryptedData).map(b => b.toString(16).padStart(2, "0")).join(""));
              
              const decryptedBuffer = await crypto.subtle.decrypt(
                  { name: "AES-CTR", counter: effectiveIV, length: 128 },
                  cryptoKey,
                  encryptedData
              );
          
              const decryptedBytes = new Uint8Array(decryptedBuffer);
          
              console.log("Decrypted Bytes:", Array.from(decryptedBytes).map(b => b.toString(16).padStart(2, "0")).join(""));
          } catch (decryptError) {
              console.error("Failed to decrypt data:", decryptError);
          }
          
            // Scansione del payload per trovare i marker
            for (let i = 0; i < decryptedBytes.length; i++) {
              if (decryptedBytes[i] === 0x04 && i + 1 < decryptedBytes.length) {
                acceleration = decryptedBytes[i + 1];
                console.log("Found acceleration marker at index", i, "with value", acceleration);
              }
              if (decryptedBytes[i] === 0x05 && i + 2 < decryptedBytes.length) {
                latitude = decryptedBytes[i + 1];
                longitude = decryptedBytes[i + 2];
                console.log("Found GPS marker at index", i, "with values", latitude, longitude);
              }
            }
  
            return {
              ...record,
              rawData: {
                ...record.rawData,
                encryptedBlock: {
                  ...record.rawData.encryptedBlock,
                  decryptedData: {
                    acceleration,
                    latitude,
                    longitude,
                    rawHex: Array.from(decryptedBytes).map(b => b.toString(16).padStart(2, "0")).join("")
                  }
                }
              }
            }
          } catch (decryptError) {
            console.error("Failed to decrypt data:", decryptError)
            return record
          }
        })
      )
  
      setSensorData(decryptedSensorData)
      setShowGroup2(true)
      setSuccess("Dati decriptati con successo!")
    } catch (err) {
      console.error("Error decrypting data:", err)
      setError("Errore nella decrittazione: " + err.message)
    } finally {
      setLoading(false)
    }
  }


  const toggleDrawer = (open) => (event) => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return
    }
    setDrawerOpen(open)
  }
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

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

  // Dati per i grafici
  // Dati per i grafici
const temperatureChartData = sensorData.map((item) => ({
  time: item.time,
  value: item.temperature,
}));

const gyroChartData = sensorData.map((item) => ({
  time: item.time,
  gx: item.gyroX,
  gy: item.gyroY,
  gz: item.gyroZ,
}));

const accelChartData = sensorData.map((item) => ({
  time: item.time,
  value: item.rawData?.encryptedBlock?.decryptedData?.acceleration || 0,
}));

const gpsChartData = sensorData.map((item) => ({
  time: item.time,
  latitude: item.rawData?.encryptedBlock?.decryptedData?.latitude || 0,
  longitude: item.rawData?.encryptedBlock?.decryptedData?.longitude || 0,
}));
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
              src="/sui-logo.png"
              alt="SUI"
              style={{
                height: "30px",
                width: "auto",
                filter: darkMode ? "brightness(1.2)" : "none",
              }}
            />
            SUI Dashboard
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
                      label="Package ID"
                      placeholder="Inserisci Package ID"
                      value={packageId}
                      onChange={(e) => setPackageId(e.target.value)}
                      darkMode={darkMode}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <StyledTextField
                        fullWidth
                        variant="outlined"
                        label="Data"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
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
                        onClick={handleFetchSensorData}
                        disabled={loading || !packageId}
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
                        onClick={handleDecryptData}
                        disabled={loading || !packageId || !masterKey || sensorData.length === 0}
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
          {sensorData.length > 0 && (
            <>
              <Grid item xs={12}>
                <Box sx={{ mt: 2, mb: 3, display: "flex", justifyContent: "center" }}>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
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
                    {showGroup2 && (
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
                          <AreaChart data={temperatureChartData}>
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

                {showGroup2 && (
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
                              <AreaChart data={accelChartData}>
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
                      {sensorData.map((item, index) => (
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
                                {new Date(item.timestamp * 1000).toLocaleString()}
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
                                {item.temperature}°C
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
                                X: {item.gyroX.toFixed(2)}, Y: {item.gyroY.toFixed(2)}, Z: {item.gyroZ.toFixed(2)}
                              </Typography>

                              {showGroup2 && item.rawData.encryptedBlock.decryptedData && (
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
                                    Accelerometro: {item.rawData.encryptedBlock.decryptedData.acceleration !== null ? item.rawData.encryptedBlock.decryptedData.acceleration : 'N/A'}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
                                  >
                                    GPS: Lat {item.rawData.encryptedBlock.decryptedData.latitude !== null ? item.rawData.encryptedBlock.decryptedData.latitude : 'N/A'}, 
                                    Long {item.rawData.encryptedBlock.decryptedData.longitude !== null ? item.rawData.encryptedBlock.decryptedData.longitude : 'N/A'}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", 
                                          wordBreak: "break-all", 
                                          fontSize: "0.75rem",
                                          mt: 1 }}
                                  >
                                    Raw Hex: {item.rawData.encryptedBlock.decryptedData.rawHex || 'N/A'}
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

export default SUI

