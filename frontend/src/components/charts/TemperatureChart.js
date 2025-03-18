"use client"

import { useState } from "react"
import { Typography, CardContent, Box, Tooltip, IconButton } from "@mui/material"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { GlassCard } from "../ui/StyledComponents"
import InfoIcon from "@mui/icons-material/Info"
import ThermostatIcon from "@mui/icons-material/Thermostat"

const CustomTooltip = ({ active, payload, label, darkMode }) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          background: darkMode ? "rgba(30,30,40,0.9)" : "rgba(255,255,255,0.9)",
          border: "none",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          p: 1.5,
          minWidth: 150,
        }}
      >
        <Typography variant="subtitle2" sx={{ color: darkMode ? "white" : "black", fontWeight: 600, mb: 0.5 }}>
          {label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ThermostatIcon sx={{ color: "#6441A5" }} />
          <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
            <span style={{ fontWeight: 600 }}>Temperatura:</span> {payload[0].value}°C
          </Typography>
        </Box>
      </Box>
    )
  }
  return null
}

const TemperatureChart = ({ data, darkMode }) => {
  const [showInfo, setShowInfo] = useState(false)

  // Calcola la temperatura media
  const avgTemp = data.length > 0 ? data.reduce((sum, item) => sum + item.value, 0) / data.length : 0

  // Trova i valori min e max
  const minTemp = data.length > 0 ? Math.min(...data.map((item) => item.value)) : 0
  const maxTemp = data.length > 0 ? Math.max(...data.map((item) => item.value)) : 0

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
            <ThermostatIcon sx={{ color: "#6441A5" }} />
            Grafico Temperatura
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
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              justifyContent: "space-around",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                Media
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: darkMode ? "white" : "black" }}>
                {avgTemp.toFixed(1)}°C
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                Min
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: darkMode ? "white" : "black" }}>
                {minTemp}°C
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                Max
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: darkMode ? "white" : "black" }}>
                {maxTemp}°C
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                Campioni
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: darkMode ? "white" : "black" }}>
                {data.length}
              </Typography>
            </Box>
          </Box>
        )}

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6441A5" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6441A5" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
            <XAxis
              dataKey="time"
              stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
              tick={{ fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis
              stroke={darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
              tick={{ fontSize: 12 }}
              tickMargin={10}
              domain={["auto", "auto"]}
              label={{
                value: "°C",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" },
              }}
            />
            <RechartsTooltip content={<CustomTooltip darkMode={darkMode} />} />
            <ReferenceLine
              y={avgTemp}
              stroke="#A865C9"
              strokeDasharray="3 3"
              label={{
                value: "Media",
                position: "right",
                fill: "#A865C9",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6441A5"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTemp)"
              name="Temperatura"
              animationDuration={1500}
              activeDot={{ r: 6, stroke: "#6441A5", strokeWidth: 2, fill: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </GlassCard>
  )
}

export default TemperatureChart

