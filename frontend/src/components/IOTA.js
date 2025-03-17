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
} from "@mui/material"
import { Contract, JsonRpcProvider } from "ethers"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"
import LockIcon from "@mui/icons-material/Lock"
import RefreshIcon from "@mui/icons-material/Refresh"
import LockOpenIcon from "@mui/icons-material/LockOpen"
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

    // Check user preference for dark mode
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
    setDarkMode(prefersDarkMode)
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen)
  }

  // Funzione per decodificare il payload
  const decodePayload = async (hex, dailyKeyHex, isClear = false) => {
    const cleanHex = hex.replace(/\s+/g, "")
    const bytes = hexStringToBytes(cleanHex)

    // Decodifica del blocco in chiaro
    const effectiveIV = bytes.slice(0, 16)
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
    const encryptedData = bytes.slice(24, 24 + encryptedBlockLength)
    let decryptedData = null

    if (!isClear && dailyKeyHex) {
      const decryptedRaw = await decryptWithAES(encryptedData, effectiveIV, dailyKeyHex)

      if (decryptedRaw) {
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
      }
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
                        disabled={!selectedDate || (!dailyKey && (!masterKey || !vehicleId || !initDate)) || loading || !contractAddress}
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
                <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={availableTabs} darkMode={darkMode} />
              </Grid>

              {/* Chart Panels */}
              <Grid item xs={12}>
                <Fade in={activeTab === 0} timeout={500}>
                  <div style={{ display: activeTab === 0 ? "block" : "none", height: "400px" }}>
                    <TemperatureChart data={clearChartData} darkMode={darkMode} />
                  </div>
                </Fade>

                <Fade in={activeTab === 1} timeout={500}>
                  <div style={{ display: activeTab === 1 ? "block" : "none", height: "400px" }}>
                    <GyroscopeChart data={gyroChartData} darkMode={darkMode} />
                  </div>
                </Fade>

                {mode === "decrypted" && (
                  <>
                    <Fade in={activeTab === 2} timeout={500}>
                      <div style={{ display: activeTab === 2 ? "block" : "none", height: "400px" }}>
                        <AccelerometerChart data={hiddenChartData} darkMode={darkMode} />
                      </div>
                    </Fade>

                    <Fade in={activeTab === 3} timeout={500}>
                      <div style={{ display: activeTab === 3 ? "block" : "none", height: "400px" }}>
                        <GPSChart data={gpsChartData} darkMode={darkMode} />
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
                                X: {item.clearBlock.gx.toFixed(2)}, Y: {item.clearBlock.gy.toFixed(2)}, Z: {item.clearBlock.gz.toFixed(2)}
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
                                    GPS: Lat {item.encryptedBlock.decryptedData.latitude}, Long {item.encryptedBlock.decryptedData.longitude}
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
