"use client"
import { Box } from "@mui/material"
import { StyledChip } from "../ui/StyledComponents"

const ChartTabs = ({ activeTab, setActiveTab, tabs, darkMode }) => {
  return (
    <Box sx={{ mt: 2, mb: 3, display: "flex", justifyContent: "center" }}>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
        {tabs.map((tab, index) => (
          <StyledChip
            key={index}
            label={tab}
            clickable
            onClick={() => setActiveTab(index)}
            active={activeTab === index}
            darkMode={darkMode}
          />
        ))}
      </Box>
    </Box>
  )
}

export default ChartTabs

