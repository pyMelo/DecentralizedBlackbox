// components/ui/StyledComponents.js - Componenti UI condivisi
import { styled } from "@mui/system"
import { Card, Button, TextField, Chip, Paper, AppBar, Toolbar } from "@mui/material"

export const GlassCard = styled(Card)(({ theme, darkMode }) => ({
  background: darkMode ? "rgba(30, 30, 40, 0.7)" : "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
  boxShadow: darkMode ? "0 8px 32px rgba(0, 0, 0, 0.3)" : "0 8px 32px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
  overflow: "hidden",
  height: "100%",
}))

export const StyledButton = styled(Button)(({ theme, darkMode }) => ({
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

export const StyledTextField = styled(TextField)(({ theme, darkMode }) => ({
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

export const StyledChip = styled(Chip)(({ theme, darkMode, active }) => ({
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

export const DataCard = styled(Paper)(({ theme, darkMode }) => ({
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

export const StyledAppBar = styled(AppBar)(({ theme, darkMode }) => ({
  background: darkMode ? "rgba(30, 30, 40, 0.8)" : "rgba(255, 255, 255, 0.8)",
  backdropFilter: "blur(10px)",
  boxShadow: darkMode ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.1)",
}))

export const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
}))

