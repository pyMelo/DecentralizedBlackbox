"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Fade,
  useMediaQuery,
  CardContent,
  Grid,
  Tooltip,
} from "@mui/material"
import { SuiClient } from "@mysten/sui/client"
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
import { hexStringToBytes, generateDailyKeySHA256, decryptWithAES } from "../utils/crypto"

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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen)
  }

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

      // Estrarre i dati dai payload
      const sensorRecords = filteredTx
        .map((tx) => {
          const hexData = tx.transaction?.data?.transaction?.inputs[1]?.value || ""
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
        })
        .filter((record) => record !== null)

      setSensorData(sensorRecords)
      setShowGroup2(false)
      setSuccess(`Recuperati ${sensorRecords.length} record di dati.`)
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
          try {
            const decryptedBytes = await decryptWithAES(
              record.rawData.encryptedBlock.encryptedData,
              record.rawData.effectiveIV,
              dailyKey,
            )

            if (!decryptedBytes) throw new Error("Decryption failed")

            // Analisi del payload decifrato
            let acceleration = null
            let latitude = null
            let longitude = null

            // Scansione del payload per trovare i marker
            for (let i = 0; i < decryptedBytes.length; i++) {
              if (decryptedBytes[i] === 0x04 && i + 1 < decryptedBytes.length) {
                acceleration = decryptedBytes[i + 1]
              }
              if (decryptedBytes[i] === 0x05 && i + 2 < decryptedBytes.length) {
                latitude = decryptedBytes[i + 1]
                longitude = decryptedBytes[i + 2]
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
                  },
                },
              },
            }
          } catch (decryptError) {
            console.error("Failed to decrypt data:", decryptError)
            return record
          }
        }),
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

  // Dati per i grafici
  const temperatureChartData = sensorData.map((item) => ({
    time: item.time,
    value: item.temperature,
  }))

  const gyroChartData = sensorData.map((item) => ({
    time: item.time,
    gx: item.gyroX,
    gy: item.gyroY,
    gz: item.gyroZ,
  }))

  const accelChartData = sensorData.map((item) => ({
    time: item.time,
    value: item.rawData?.encryptedBlock?.decryptedData?.acceleration || 0,
  }))

  const gpsChartData = sensorData.map((item) => ({
    time: item.time,
    latitude: item.rawData?.encryptedBlock?.decryptedData?.latitude || 0,
    longitude: item.rawData?.encryptedBlock?.decryptedData?.longitude || 0,
  }))

  // Tabs disponibili in base allo stato
  const availableTabs = showGroup2
    ? ["Temperatura", "Giroscopio", "Accelerometro", "GPS"]
    : ["Temperatura", "Giroscopio"]

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
        title="SUI Dashboard"
        logoSrc="./sui-logo.png"
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
                <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={availableTabs} darkMode={darkMode} />
              </Grid>

              {/* Chart Panels */}
              <Grid item xs={12}>
                <Fade in={activeTab === 0} timeout={500}>
                  <div style={{ display: activeTab === 0 ? "block" : "none", height: "400px" }}>
                    <TemperatureChart data={temperatureChartData} darkMode={darkMode} />
                  </div>
                </Fade>

                <Fade in={activeTab === 1} timeout={500}>
                  <div style={{ display: activeTab === 1 ? "block" : "none", height: "400px" }}>
                    <GyroscopeChart data={gyroChartData} darkMode={darkMode} />
                  </div>
                </Fade>

                {showGroup2 && (
                  <>
                    <Fade in={activeTab === 2} timeout={500}>
                      <div style={{ display: activeTab === 2 ? "block" : "none", height: "400px" }}>
                        <AccelerometerChart data={accelChartData} darkMode={darkMode} />
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
                                    Accelerometro:{" "}
                                    {item.rawData.encryptedBlock.decryptedData.acceleration !== null
                                      ? item.rawData.encryptedBlock.decryptedData.acceleration
                                      : "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
                                  >
                                    GPS: Lat{" "}
                                    {item.rawData.encryptedBlock.decryptedData.latitude !== null
                                      ? item.rawData.encryptedBlock.decryptedData.latitude
                                      : "N/A"}
                                    , Long{" "}
                                    {item.rawData.encryptedBlock.decryptedData.longitude !== null
                                      ? item.rawData.encryptedBlock.decryptedData.longitude
                                      : "N/A"}
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

