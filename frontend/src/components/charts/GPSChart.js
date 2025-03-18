import React, { useState } from "react"
import { Typography, CardContent, Box, Tooltip, IconButton, useTheme } from "@mui/material"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts"
import { GlassCard } from "../ui/StyledComponents"
import InfoIcon from "@mui/icons-material/Info"
import LocationOnIcon from "@mui/icons-material/LocationOn"
import MyLocationIcon from "@mui/icons-material/MyLocation"

const CustomTooltip = ({ active, payload, darkMode }) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          background: darkMode ? "rgba(30,30,40,0.9)" : "rgba(255,255,255,0.9)",
          border: "none",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          p: 1.5,
          minWidth: 180,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: darkMode ? "white" : "black", fontWeight: 600, mb: 0.5 }}
        >
          Posizione
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <LocationOnIcon sx={{ color: "#A865C9" }} />
          <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
            <span style={{ fontWeight: 600 }}>Lat:</span> {payload[0].payload.latitude}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LocationOnIcon sx={{ color: "#6441A5" }} />
          <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
            <span style={{ fontWeight: 600 }}>Long:</span> {payload[0].payload.longitude}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", display: "block", mt: 1 }}
        >
          {payload[0].payload.time}
        </Typography>
      </Box>
    )
  }
  return null
}

const GPSChart = ({ data, darkMode }) => {
  const [showInfo, setShowInfo] = useState(false)
  const theme = useTheme()
  
  // Trasforma i dati per il grafico a dispersione
  const scatterData = data.map((item) => ({
    ...item,
    x: item.longitude,
    y: item.latitude,
    z: 1, // Dimensione del punto
  }))
  
  // Calcola il centro della mappa (media di lat e long)
  const centerLat = data.length > 0 
    ? data.reduce((sum, item) => sum + item.latitude, 0) / data.length 
    : 0
  const centerLong = data.length > 0 
    ? data.reduce((sum, item) => sum + item.longitude, 0) / data.length 
    : 0
  
  // Calcola il raggio per determinare i limiti della mappa
  const calcRadius = () => {
    if (data.length <= 1) return 5
    
    let maxDist = 0
    data.forEach(item => {
      const dist = Math.sqrt(
        Math.pow(item.latitude - centerLat, 2) + 
        Math.pow(item.longitude - centerLong, 2)
      )
      if (dist > maxDist) maxDist = dist
    })
    
    return Math.max(maxDist * 1.5, 5) // Assicura un minimo di raggio
  }
  
  const radius = calcRadius()
  
  // Calcola i limiti degli assi
  const minLat = centerLat - radius
  const maxLat = centerLat + radius
  const minLong = centerLong - radius
  const maxLong = centerLong + radius

  return (
    <GlassCard darkMode={darkMode}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: darkMode ? "white" : "black",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <MyLocationIcon sx={{ color: "#6441A5" }} />
            Mappa GPS
          </Typography>
          <Tooltip title="Mostra statistiche">
            <IconButton 
              size="small" 
              onClick={() => setShowInfo(!showInfo)}
              sx={{ color: darkMode ? "white" : "black" }}
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {showInfo && (
          <Box 
            sx={{ 
              mb: 2, 
              p: 1.5, 
              borderRadius: "8px", 
              background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: darkMode ? "white" : "black" }}>
              Informazioni GPS
            </Typography>
            
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between" }}>
              <Box>
                <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                  Posizione Media
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Lat:</span> {centerLat.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Long:</span> {centerLong.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                  Campioni
                </Typography>
                <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                  <span style={{ fontWeight: 600 }}>{data.length}</span> punti rilevati
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
        
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
            />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Longitudine" 
              domain={[minLong, maxLong]}
              stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
              label={{ 
                value: 'Longitudine', 
                position: 'bottom',
                style: { textAnchor: 'middle', fill: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }
              }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Latitudine" 
              domain={[minLat, maxLat]}
              stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
              label={{ 
                value: 'Latitudine', 
                angle: -90, 
                position: 'left',
                style: { textAnchor: 'middle', fill: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }
              }}
            />
            <ZAxis type="number" dataKey="z" range={[60, 60]} />
            <RechartsTooltip content={<CustomTooltip darkMode={darkMode} />} />
            
            {/* Linee di riferimento per il centro */}
            <ReferenceLine 
              x={centerLong} 
              stroke="#A865C9" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
            <ReferenceLine 
              y={centerLat} 
              stroke="#A865C9" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
            
            {/* Punto centrale */}
            <Scatter 
              name="Centro" 
              data={[{x: centerLong, y: centerLat, z: 1}]} 
              fill="#A865C9" 
              shape="cross"
            />
            
            {/* Dati GPS */}
            <Scatter 
              name="Posizioni GPS" 
              data={scatterData} 
              fill="#6441A5"
              shape={(props) => {
                const { cx, cy } = props
                return (
                  <svg>
                    <circle cx={cx} cy={cy} r={6} fill="#6441A5" stroke="#fff" strokeWidth={1} />
                    <circle cx={cx} cy={cy} r={10} fill="none" stroke="#6441A5" strokeWidth={1} strokeOpacity={0.5} />
                  </svg>
                )
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </GlassCard>
  )
}

export default GPSChart
