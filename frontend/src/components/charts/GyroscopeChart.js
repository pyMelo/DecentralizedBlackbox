"use client"

import { useState } from "react"
import { Typography, CardContent, Box, Tooltip, IconButton } from "@mui/material"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts"
import { GlassCard } from "../ui/StyledComponents"
import InfoIcon from "@mui/icons-material/Info"
import RotateRightIcon from "@mui/icons-material/RotateRight"

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
          minWidth: 180,
        }}
      >
        <Typography variant="subtitle2" sx={{ color: darkMode ? "white" : "black", fontWeight: 600, mb: 0.5 }}>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: entry.color,
              }}
            />
            <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
              <span style={{ fontWeight: 600 }}>{entry.name}:</span> {entry.value.toFixed(2)}
            </Typography>
          </Box>
        ))}
      </Box>
    )
  }
  return null
}

const GyroscopeChart = ({ data, darkMode }) => {
  const [showInfo, setShowInfo] = useState(false)

  // Calcola le statistiche
  const calcStats = (axis) => {
    if (data.length === 0) return { avg: 0, min: 0, max: 0 }
    const values = data.map((item) => item[axis])
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    return { avg, min, max }
  }

  const statsX = calcStats("gx")
  const statsY = calcStats("gy")
  const statsZ = calcStats("gz")

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
            <RotateRightIcon sx={{ color: "#6441A5" }} />
            Grafico Giroscopio
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
              Statistiche Giroscopio
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between" }}>
              <Box>
                <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                  Asse X
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Avg:</span> {statsX.avg.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Min:</span> {statsX.min.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Max:</span> {statsX.max.toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                  Asse Y
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Avg:</span> {statsY.avg.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Min:</span> {statsY.min.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Max:</span> {statsY.max.toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                  Asse Z
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Avg:</span> {statsZ.avg.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Min:</span> {statsZ.min.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                    <span style={{ fontWeight: 600 }}>Max:</span> {statsZ.max.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                value: "rad/s",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" },
              }}
            />
            <RechartsTooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{
                paddingTop: 10,
                color: darkMode ? "white" : "black",
              }}
            />
            <Brush
              dataKey="time"
              height={30}
              stroke="#6441A5"
              fill={darkMode ? "rgba(30,30,40,0.5)" : "rgba(255,255,255,0.5)"}
              tickFormatter={(time) => ""}
            />
            <Line
              type="monotone"
              dataKey="gx"
              stroke="#8884d8"
              name="Giroscopio X"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: "#8884d8", strokeWidth: 2, fill: "#fff" }}
              animationDuration={1500}
            />
            <Line
              type="monotone"
              dataKey="gy"
              stroke="#82ca9d"
              name="Giroscopio Y"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: "#82ca9d", strokeWidth: 2, fill: "#fff" }}
              animationDuration={1500}
              animationBegin={300}
            />
            <Line
              type="monotone"
              dataKey="gz"
              stroke="#ffc658"
              name="Giroscopio Z"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: "#ffc658", strokeWidth: 2, fill: "#fff" }}
              animationDuration={1500}
              animationBegin={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </GlassCard>
  )
}

export default GyroscopeChart

