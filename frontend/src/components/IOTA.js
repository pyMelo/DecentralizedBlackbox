"use client"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Alert,
  IconButton,
  Fade,
  useMediaQuery,
  CardContent,
  Grid,
  CircularProgress,
  Tooltip,
  Paper,
  Switch,
  FormControlLabel,
} from "@mui/material"
import { Contract, JsonRpcProvider } from "ethers"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"
import LockIcon from "@mui/icons-material/Lock"
import RefreshIcon from "@mui/icons-material/Refresh"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import GridViewIcon from "@mui/icons-material/GridView"
import { useNavigate } from "react-router-dom"

// Componenti condivisi
import AppHeader from "./common/AppHeader"
import AppDrawer from "./common/AppDrawer"
import ChartTabs from "./common/ChartTabs"
import TemperatureChart from "./charts/TemperatureChart"
import GyroscopeChart from "./charts/GyroscopeChart"
import AccelerometerChart from "./charts/AccelerometerChart"
import GPSChart from "./charts/GPSChart"

// Componenti UI stilizzati
import { GlassCard, StyledButton, StyledTextField, DataCard } from "./ui/StyledComponents"

// Utilità di crittografia
import { generateDailyKeySHA256, getEpochUTC, hexStringToBytes, decryptWithAES } from "../utils/crypto"

const IOTA = () => {
  const navigate = useNavigate()
  const isMobile = useMediaQuery("(max-width:768px)")
  const [darkMode, setDarkMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [showAllCharts, setShowAllCharts] = useState(false)

  const [mode, setMode] = useState("clear")
  const [masterKey, setMasterKey] = useState("")
  // Nuovo stato per la Daily Key (facoltativo)
  const [dailyKey, setDailyKey] = useState("")
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

    // Impostiamo la modalità chiara come predefinita
    setDarkMode(false)
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen)
  }

  const toggleShowAllCharts = () => {
    setShowAllCharts(!showAllCharts)
  }

  // Funzione per decodificare il payload
 // Function to decode the updated payload
// Function to decode the updated payload with extensive console logging
const decodePayload = async (hex, dailyKeyHex, isClear = false) => {
  console.log("-------- DECODIFICA PAYLOAD --------")
  console.log("Hex payload:", hex)
  
  // Rimuovi il prefisso 0x se presente
  const cleanHex = hex.startsWith("0x") 
    ? hex.substring(2).replace(/\s+/g, "") 
    : hex.replace(/\s+/g, "")
  console.log("Clean hex:", cleanHex)
  
  const bytes = hexStringToBytes(cleanHex)
  console.log("Bytes array length:", bytes.length)
  console.log("Raw bytes:", Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '))

  // Decodifica del blocco in chiaro
  const effectiveIV = bytes.slice(0, 16)
  console.log("Effective IV:", Array.from(effectiveIV).map(b => b.toString(16).padStart(2, '0')).join(' '))
  
  // CORREZIONE: Posizione corretta per clearBlockLength
  const clearBlockLength = bytes[16]
  console.log("Clear block length:", clearBlockLength)
  
  // CORREZIONE: Verificare che clearBlockLength sia un valore ragionevole (ad es. 6)
  if (clearBlockLength !== 6) {
    console.warn(`Valore clearBlockLength (${clearBlockLength}) non corrisponde al valore atteso (6)`)
  }
  
  const sensorMarker = bytes[17]
  console.log("Sensor marker:", "0x" + sensorMarker.toString(16))
  
  const temperature = bytes[18]
  console.log("Temperature:", temperature, "°C")
  
  const gyroMarker = bytes[19]
  console.log("Gyro marker:", "0x" + gyroMarker.toString(16))

  // Giroscopio
  const gyroRawX = bytes[20]
  const gyroRawY = bytes[21]
  const gyroRawZ = bytes[22]
  console.log("Gyro raw values - X:", gyroRawX, "Y:", gyroRawY, "Z:", gyroRawZ)
  
  const toSigned8Bit = (byte) => (byte > 127 ? byte - 256 : byte)
  const gx = toSigned8Bit(gyroRawX) / 100
  const gy = toSigned8Bit(gyroRawY) / 100
  const gz = toSigned8Bit(gyroRawZ) / 100
  console.log("Gyro converted values - X:", gx.toFixed(2), "Y:", gy.toFixed(2), "Z:", gz.toFixed(2))

  // CORREZIONE: Posizione corretta per encryptedBlockLength
  const encryptedBlockLength = bytes[23]
  console.log("Encrypted block length:", encryptedBlockLength)
  
  // CORREZIONE: Verificare che encryptedBlockLength sia un valore ragionevole (ad es. 11)
  if (encryptedBlockLength !== 11 && !isClear) {
    console.warn(`Valore encryptedBlockLength (${encryptedBlockLength}) non corrisponde al valore atteso (11)`)
  }
  
  // Estrai i dati crittografati solo se encryptedBlockLength > 0
  const encryptedData = encryptedBlockLength > 0 
    ? bytes.slice(24, 24 + encryptedBlockLength) 
    : new Uint8Array(0)
  console.log("Encrypted data (hex):", Array.from(encryptedData).map(b => b.toString(16).padStart(2, '0')).join(' '))
  
  let decryptedData = null

  if (!isClear && dailyKeyHex && encryptedBlockLength > 0) {
    console.log("Attempting decryption with daily key:", dailyKeyHex)
    
    try {
      const decryptedRaw = await decryptWithAES(encryptedData, effectiveIV, dailyKeyHex)
      
      if (decryptedRaw) {
        console.log("Decryption successful!")
        console.log("Decrypted raw data:", Array.from(decryptedRaw).map(b => b.toString(16).padStart(2, '0')).join(' '))
        
        // Struttura aggiornata per i dati cifrati
        const accelMarker = decryptedRaw[0]
        console.log("Accelerometer marker:", "0x" + accelMarker.toString(16))
        
        const acceleration = decryptedRaw[1]
        console.log("Acceleration value:", acceleration)
        
        const gpsMarker = decryptedRaw[2]
        console.log("GPS marker:", "0x" + gpsMarker.toString(16))
        
        // Log dei bytes della latitudine
        console.log("Latitude bytes:", 
          decryptedRaw[3].toString(16).padStart(2, '0'), 
          decryptedRaw[4].toString(16).padStart(2, '0'), 
          decryptedRaw[5].toString(16).padStart(2, '0'), 
          decryptedRaw[6].toString(16).padStart(2, '0')
        )
        
        // Estrae latitudine (4 bytes, int32_t)
        const latBytes = new Uint8Array([
          decryptedRaw[3], 
          decryptedRaw[4], 
          decryptedRaw[5], 
          decryptedRaw[6]
        ])
        
        const latView = new DataView(latBytes.buffer)
        const latScaled = latView.getInt32(0, true) // true per little-endian
        console.log("Latitude raw int32:", latScaled)
        
        // Log dei bytes della longitudine
        console.log("Longitude bytes:", 
          decryptedRaw[7].toString(16).padStart(2, '0'), 
          decryptedRaw[8].toString(16).padStart(2, '0'), 
          decryptedRaw[9].toString(16).padStart(2, '0'), 
          decryptedRaw[10].toString(16).padStart(2, '0')
        )
        
        // Estrae longitudine (4 bytes, int32_t)
        const lonBytes = new Uint8Array([
          decryptedRaw[7], 
          decryptedRaw[8], 
          decryptedRaw[9], 
          decryptedRaw[10]
        ])
        
        const lonView = new DataView(lonBytes.buffer)
        const lonScaled = lonView.getInt32(0, true) // true per little-endian
        console.log("Longitude raw int32:", lonScaled)
        
        // Converte i valori scalati in gradi decimali (divisione per 1e7)
        const latitude = latScaled / 10000000
        const longitude = lonScaled / 10000000
        console.log("Converted coordinates - Lat:", latitude.toFixed(7), "Lon:", longitude.toFixed(7))
        
        decryptedData = {
          acceleration,
          latitude,
          longitude,
          latRaw: latScaled,
          lonRaw: lonScaled
        }
        
        console.log("Final decrypted data object:", decryptedData)
      } else {
        console.error("Decryption failed!")
      }
    } catch (error) {
      console.error("Error during decryption:", error)
    }
  } else {
    console.log("Skipping decryption - isClear:", isClear, "dailyKeyHex provided:", !!dailyKeyHex, "encryptedBlockLength:", encryptedBlockLength)
  }

  console.log("-------- FINE DECODIFICA --------")

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
      const dateKey = getEpochUTC(selectedDate)
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
    // Verifica che siano compilati i campi necessari:
    // Se è presente la Daily Key, non occorrono Master Key, Vehicle ID e Init Date.
    if (!contractAddress || !selectedDate || (!dailyKey && (!masterKey || !vehicleId || !initDate))) {
      setError("Compila tutti i campi necessari per i dati nascosti (oppure inserisci direttamente la Daily Key).")
      return
    }
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      // Se l'utente ha inserito direttamente la Daily Key, la usiamo; altrimenti, la generiamo
      let dailyKeyHex
      if (dailyKey) {
        dailyKeyHex = dailyKey.trim()
      } else {
        dailyKeyHex = await generateDailyKeySHA256(masterKey, vehicleId, initDate, selectedDate)
      }
      console.log("Daily Key:", dailyKeyHex)

      const dateKey = getEpochUTC(selectedDate)
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

  // Tabs disponibili in base allo stato
  const availableTabs =
    mode === "decrypted" ? ["Temperatura", "Giroscopio", "Accelerometro", "GPS"] : ["Temperatura", "Giroscopio"]

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
      {/* App Header */}
      <AppHeader
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        toggleDrawer={() => setDrawerOpen(true)}
        title="IOTA Dashboard"
        logoSrc="/iota-logo.png"
      />

      {/* Drawer */}
      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {/* Main Content */}
      <Box sx={{ p: 3, maxWidth: "1400px", mx: "auto" }}>
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
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
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
                  <Grid item xs={12} md={4}>
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
                  <Grid item xs={12} md={4}>
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
                        height: "56px",
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : "Mostra Dati in Chiaro"}
                    </StyledButton>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <StyledTextField
                      fullWidth
                      variant="outlined"
                      label="Master Key (hex)"
                      placeholder="Inserisci Master Key per generare la Daily Key"
                      value={masterKey}
                      onChange={(e) => setMasterKey(e.target.value)}
                      darkMode={darkMode}
                      InputProps={{
                        endAdornment: (
                          <Tooltip title="Master Key">
                            <IconButton edge="end" sx={{ color: darkMode ? "white" : "black" }}>
                              <LockIcon />
                            </IconButton>
                          </Tooltip>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {/* Campo opzionale per inserire direttamente la Daily Key */}
                    <StyledTextField
                      fullWidth
                      variant="outlined"
                      label="Daily Key (hex)"
                      placeholder="Inserisci Daily Key se già disponibile"
                      value={dailyKey}
                      onChange={(e) => setDailyKey(e.target.value)}
                      darkMode={darkMode}
                      InputProps={{
                        endAdornment: (
                          <Tooltip title="Daily Key">
                            <IconButton edge="end" sx={{ color: darkMode ? "white" : "black" }}>
                              <LockOpenIcon />
                            </IconButton>
                          </Tooltip>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <StyledButton
                      variant="contained"
                      fullWidth
                      onClick={handleFetchData}
                      disabled={
                        !selectedDate ||
                        (!dailyKey && (!masterKey || !vehicleId || !initDate)) ||
                        loading ||
                        !contractAddress
                      }
                      startIcon={<LockOpenIcon />}
                      darkMode={darkMode}
                      sx={{
                        background: darkMode ? "#6441A5" : "#6441A5",
                        color: "white",
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : "Mostra Dati Nascosti"}
                    </StyledButton>
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
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                    p: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    {!showAllCharts && (
                      <ChartTabs
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        tabs={availableTabs}
                        darkMode={darkMode}
                      />
                    )}
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showAllCharts}
                        onChange={toggleShowAllCharts}
                        color={darkMode ? "default" : "primary"}
                      />
                    }
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <GridViewIcon sx={{ color: darkMode ? "white" : "#6441A5" }} />
                        <Typography sx={{ color: darkMode ? "white" : "#6441A5", fontWeight: 500 }}>
                          Mostra tutti i grafici
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </Grid>

              {/* Chart Panels */}
              <Grid item xs={12}>
                <Grid container spacing={3}>
                  {/* Temperatura Chart */}
                  <Grid item xs={12} md={showAllCharts ? 6 : 12}>
                    <Fade in={showAllCharts || activeTab === 0} timeout={500}>
                      <Paper
                        elevation={0}
                        sx={{
                          display: showAllCharts || activeTab === 0 ? "block" : "none",
                          height: "400px",
                          borderRadius: "16px",
                          overflow: "hidden",
                          background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.8)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                          p: 2,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 1,
                            fontWeight: 600,
                            color: darkMode ? "white" : "#6441A5",
                            textAlign: "center",
                          }}
                        >
                          Temperatura
                        </Typography>
                        <TemperatureChart data={clearChartData} darkMode={darkMode} />
                      </Paper>
                    </Fade>
                  </Grid>

                  {/* Giroscopio Chart */}
                  <Grid item xs={12} md={showAllCharts ? 6 : 12}>
                    <Fade in={showAllCharts || activeTab === 1} timeout={500}>
                      <Paper
                        elevation={0}
                        sx={{
                          display: showAllCharts || activeTab === 1 ? "block" : "none",
                          height: "400px",
                          borderRadius: "16px",
                          overflow: "hidden",
                          background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.8)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                          p: 2,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 1,
                            fontWeight: 600,
                            color: darkMode ? "white" : "#6441A5",
                            textAlign: "center",
                          }}
                        >
                          Giroscopio
                        </Typography>
                        <GyroscopeChart data={gyroChartData} darkMode={darkMode} />
                      </Paper>
                    </Fade>
                  </Grid>

                  {mode === "decrypted" && (
                    <>
                      {/* Accelerometro Chart */}
                      <Grid item xs={12} md={showAllCharts ? 6 : 12}>
                        <Fade in={showAllCharts || activeTab === 2} timeout={500}>
                          <Paper
                            elevation={0}
                            sx={{
                              display: showAllCharts || activeTab === 2 ? "block" : "none",
                              height: "400px",
                              borderRadius: "16px",
                              overflow: "hidden",
                              background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.8)",
                              backdropFilter: "blur(10px)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                              p: 2,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 1,
                                fontWeight: 600,
                                color: darkMode ? "white" : "#6441A5",
                                textAlign: "center",
                              }}
                            >
                              Accelerometro
                            </Typography>
                            <AccelerometerChart data={hiddenChartData} darkMode={darkMode} />
                          </Paper>
                        </Fade>
                      </Grid>

                      {/* GPS Chart */}
                      <Grid item xs={12} md={showAllCharts ? 6 : 12}>
                        <Fade in={showAllCharts || activeTab === 3} timeout={500}>
                          <Paper
                            elevation={0}
                            sx={{
                              display: showAllCharts || activeTab === 3 ? "block" : "none",
                              height: "400px",
                              borderRadius: "16px",
                              overflow: "hidden",
                              background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.8)",
                              backdropFilter: "blur(10px)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                              p: 2,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 1,
                                fontWeight: 600,
                                color: darkMode ? "white" : "#6441A5",
                                textAlign: "center",
                              }}
                            >
                              GPS
                            </Typography>
                            <GPSChart data={gpsChartData} darkMode={darkMode} />
                          </Paper>
                        </Fade>
                      </Grid>
                    </>
                  )}
                </Grid>
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
                                    GPS: Lat {item.encryptedBlock.decryptedData.latitude.toFixed(7)} ({item.encryptedBlock.decryptedData.latRaw}), 
                                    Long {item.encryptedBlock.decryptedData.longitude.toFixed(7)} ({item.encryptedBlock.decryptedData.lonRaw})
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

