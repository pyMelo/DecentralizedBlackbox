"use client"
import { Typography, IconButton, Tooltip } from "@mui/material"
import {
  Menu as MenuIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Home as HomeIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { StyledAppBar, StyledToolbar } from "../ui/StyledComponents"

const AppHeader = ({ darkMode, toggleDarkMode, toggleDrawer, title, logoSrc }) => {
  const navigate = useNavigate()

  return (
    <StyledAppBar position="sticky" darkMode={darkMode}>
      <StyledToolbar>
        <div style={{ display: "flex", alignItems: "center" }}>
          <IconButton
            edge="start"
            aria-label="menu"
            onClick={toggleDrawer}
            sx={{ mr: 2, color: darkMode ? "white" : "black" }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: darkMode ? "white" : "black",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <img
              src={logoSrc || "/placeholder.svg"}
              alt={title}
              style={{
                height: "30px",
                width: "auto",
                filter: darkMode ? "brightness(1.2)" : "none",
              }}
            />
            {title}
          </Typography>
        </div>
        <div>
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
        </div>
      </StyledToolbar>
    </StyledAppBar>
  )
}

export default AppHeader

