"use client"
import { Box, Typography, Button, Divider, IconButton, FormControlLabel, Switch, Drawer } from "@mui/material"
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"

const AppDrawer = ({ open, onClose, darkMode, toggleDarkMode }) => {
  const navigate = useNavigate()

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box
        sx={{
          width: 250,
          height: "100%",
          background: darkMode ? "#1E1E28" : "#f5f5f5",
          color: darkMode ? "white" : "black",
          p: 2,
        }}
        role="presentation"
        onClick={onClose}
        onKeyDown={onClose}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Menu
          </Typography>
          <IconButton onClick={onClose}>
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
          <Button
            startIcon={<InfoIcon />}
            sx={{ justifyContent: "flex-start", textTransform: "none", fontWeight: 500 }}
          >
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
    </Drawer>
  )
}

export default AppDrawer

