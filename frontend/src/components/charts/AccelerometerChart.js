"use client"

import { useState } from "react"
import { Typography, CardContent, Box, Tooltip, IconButton } from "@mui/material"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import { GlassCard } from "../ui/StyledComponents"
import InfoIcon from "@mui/icons-material/Info"
import SpeedIcon from "@mui/icons-material/Speed"

const CustomTooltip = ({ active, payload, label, darkMode }) => {
  if (active && payload && payload.length) {
    // Determina il colore in base al valore
    const value = payload[0].value
    let color = "#6441A5" // default
    let intensity = "Normale"

    if (value > 200) {
      color = "#ff5252"
      intensity = "Alta"
    } else if (value > 100) {
      color = "#ffa726"
      intensity = "Media"
    }

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
          <SpeedIcon sx={{ color: color }} />
          <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
            <span style={{ fontWeight: 600 }}>Accelerazione:</span> {value}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: color,
            fontWeight: 600,
            mt: 0.5,
            display: "block",
          }}
        >
          Intensità: {intensity}
        </Typography>
      </Box>
    )
  }
  return null
}

const AccelerometerChart = ({ data, darkMode }) => {
  const [showInfo, setShowInfo] = useState(false)

  // Calcola statistiche
  const values = data.map((item) => item.value)
  const avgAccel = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  const maxAccel = values.length > 0 ? Math.max(...values) : 0
  const minAccel = values.length > 0 ? Math.min(...values) : 0

  // Soglie per le intensità
  const mediumThreshold = 100
  const highThreshold = 200

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
            <SpeedIcon sx={{ color: "#6441A5" }} />
            Grafico Accelerometro
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
                {avgAccel.toFixed(1)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                Min
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: darkMode ? "white" : "black" }}>
                {minAccel}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                Max
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: darkMode ? "white" : "black" }}>
                {maxAccel}
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

        {/* Legenda delle intensità */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#6441A5" }} />
            <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
              Normale (&lt;{mediumThreshold})
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#ffa726" }} />
            <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
              Media ({mediumThreshold}-{highThreshold})
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#ff5252" }} />
            <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
              Alta (&gt;{highThreshold})
            </Typography>
          </Box>
        </Box>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              domain={[0, "auto"]}
              label={{
                value: "Accelerazione",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" },
              }}
            />
            <RechartsTooltip content={<CustomTooltip darkMode={darkMode} />} />

            {/* Linee di riferimento per le soglie */}
            <ReferenceLine
              y={mediumThreshold}
              stroke="#ffa726"
              strokeDasharray="3 3"
              label={{
                value: "Media",
                position: "right",
                fill: "#ffa726",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={highThreshold}
              stroke="#ff5252"
              strokeDasharray="3 3"
              label={{
                value: "Alta",
                position: "right",
                fill: "#ff5252",
                fontSize: 12,
              }}
            />

            <Bar dataKey="value" name="Accelerazione" animationDuration={1500} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                let fill = "#6441A5" // default
                if (entry.value > highThreshold) {
                  fill = "#ff5252" // rosso per alta intensità
                } else if (entry.value > mediumThreshold) {
                  fill = "#ffa726" // arancione per media intensità
                }
                return <Cell key={`cell-${index}`} fill={fill} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </GlassCard>
  )
}

export default AccelerometerChart

