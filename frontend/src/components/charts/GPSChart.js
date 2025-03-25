"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Import Leaflet styles
import "leaflet/dist/leaflet.css";

const GPSChart = ({ data, darkMode = false }) => {
  // States to control info visibility, map visibility and loading/error states
  const [showInfo, setShowInfo] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  // Refs for map container and map instance
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const initializedRef = useRef(false);
  const resizeTimeoutsRef = useRef([]);

  // Filter valid GPS data
  const validData = data.filter(
    (item) =>
      item.latitude &&
      item.longitude &&
      item.latitude !== 0 &&
      item.longitude !== 0
  );

  // Calculate center of map (if no valid data, remains 0)
  const centerLat =
    validData.length > 0
      ? validData.reduce((sum, item) => sum + item.latitude, 0) / validData.length
      : 0;
  const centerLong =
    validData.length > 0
      ? validData.reduce((sum, item) => sum + item.longitude, 0) / validData.length
      : 0;

  // Resize the map if the container is visible
  const resizeMap = useCallback(() => {
    try {
      if (mapInstanceRef.current && mapContainerRef.current) {
        if (mapContainerRef.current.offsetHeight === 0) return;
        mapInstanceRef.current.invalidateSize(true);
      }
    } catch (error) {
      console.error("Error resizing the map:", error);
      setMapError(true);
    }
  }, []);

  // Cleanup function to remove timeouts and the map instance (called on unmount)
  const cleanupMap = useCallback(() => {
    resizeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    resizeTimeoutsRef.current = [];
    if (mapInstanceRef.current) {
      mapInstanceRef.current.off();
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    initializedRef.current = false;
  }, []);

  // Initialize the map only once (on mount)
  useEffect(() => {
    // If map is already initialized, do nothing
    if (initializedRef.current) return;
    if (!validData.length) {
      setLoading(false);
      return;
    }
    initializedRef.current = true;

    const initializeMap = async () => {
      try {
        setLoading(true);
        setMapError(false);
        const L = await import("leaflet");

        // Fix missing icon issue
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        const mapContainer = mapContainerRef.current;
        if (!mapContainer) throw new Error("Map container not found");

        // Set container dimensions (we control visibility via CSS)
        mapContainer.style.width = "100%";
        mapContainer.style.height = showMap ? "250px" : "0px";

        // Create the map and store in the ref
        mapInstanceRef.current = L.map(mapContainer, {
          center: [centerLat, centerLong],
          zoom: 15,
          attributionControl: true,
          zoomControl: true,
        });
        const currentMap = mapInstanceRef.current;

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(currentMap);

        // Add markers and polyline once using validData
        if (validData.length > 0) {
          const markers = [];
          const points = [];
          validData.forEach((point) => {
            const marker = L.marker([point.latitude, point.longitude]).addTo(currentMap);
            markers.push(marker);
            points.push([point.latitude, point.longitude]);
          });
          if (points.length > 1) {
            L.polyline(points, {
              color: "#6441A5",
              weight: 3,
              opacity: 0.7,
              dashArray: "5, 5",
            }).addTo(currentMap);
          }
          // Center the map based on marker bounds
          const bounds = L.latLngBounds(points);
          currentMap.fitBounds(bounds, { padding: [30, 30] });
        }
        // (Note: we are not refreshing markers if validData changes later.)

        // Add a ResizeObserver to trigger resizeMap
        const resizeObserver = new ResizeObserver(() => {
          const timeout = setTimeout(resizeMap, 100);
          resizeTimeoutsRef.current.push(timeout);
        });
        resizeObserver.observe(mapContainer);

        setLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapError(true);
        setLoading(false);
      }
    };

    initializeMap();
    return () => {
      cleanupMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty dependency array: initialize only once

  // Effect to resize the map when showMap changes (but do nothing if map is already active)
  useEffect(() => {
    if (showMap && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 300);
    }
  }, [showMap]);

  // Additional effect for darkMode changes (if needed)
  useEffect(() => {
    const timeout1 = setTimeout(resizeMap, 100);
    const timeout2 = setTimeout(resizeMap, 300);
    const timeout3 = setTimeout(resizeMap, 500);
    resizeTimeoutsRef.current.push(timeout1, timeout2, timeout3);
    return () => {
      resizeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      resizeTimeoutsRef.current = [];
    };
  }, [darkMode, resizeMap]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, color: darkMode ? "white" : "#6441A5", display: "flex", alignItems: "center", gap: 1 }}
        >
          <MyLocationIcon sx={{ color: "#6441A5" }} />
          Mappa GPS
        </Typography>
        <Box>
          <Tooltip title="Mostra statistiche">
            <IconButton size="small" onClick={() => setShowInfo((prev) => !prev)} sx={{ color: darkMode ? "white" : "black" }}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={showMap ? "Nascondi mappa" : "Mostra mappa"}>
            <IconButton size="small" onClick={() => setShowMap((prev) => !prev)} sx={{ color: darkMode ? "white" : "black" }}>
              {showMap ? <ErrorOutlineIcon /> : <MyLocationIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Info Section */}
      {showInfo && (
        <Paper
          elevation={0}
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
                  <span style={{ fontWeight: 600 }}>Lat:</span> {centerLat.toFixed(6)}
                </Typography>
                <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                  <span style={{ fontWeight: 600 }}>Long:</span> {centerLong.toFixed(6)}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                Campioni
              </Typography>
              <Typography variant="body2" sx={{ color: darkMode ? "white" : "black" }}>
                <span style={{ fontWeight: 600 }}>{validData.length}</span> punti rilevati
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Map Container */}
      {validData.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: darkMode ? "white" : "black",
            gap: 2,
            p: 3,
            borderRadius: "8px",
            background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          }}
        >
          <MyLocationIcon sx={{ fontSize: 48, color: "#6441A5", opacity: 0.5 }} />
          <Typography variant="body1" sx={{ textAlign: "center" }}>
            Nessun dato GPS valido disponibile
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid",
            borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            minHeight: "250px",
            width: "100%",
            position: "relative",
          }}
        >
          <Box
            ref={mapContainerRef}
            sx={{
              width: "100%",
              height: showMap ? "250px" : "0px",
              backgroundColor: darkMode ? "#1e1e2f" : "#f5f5f5",
              transition: "height 0.3s ease",
            }}
          />
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: darkMode
                  ? "rgba(30,30,47,0.7)"
                  : "rgba(245,245,245,0.7)",
              }}
            >
              <CircularProgress size={40} sx={{ color: "#6441A5" }} />
              <Typography variant="body2" sx={{ mt: 2, color: darkMode ? "white" : "black", fontWeight: 500 }}>
                Caricamento mappa...
              </Typography>
            </Box>
          )}
          {mapError && !loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: darkMode ? "#1e1e2f" : "#f5f5f5",
                p: 3,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 48, color: "#ff5252", mb: 2 }} />
              <Typography
                variant="body1"
                sx={{ color: darkMode ? "white" : "black", fontWeight: 500, textAlign: "center", mb: 1 }}
              >
                Impossibile caricare la mappa
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", textAlign: "center", maxWidth: "80%" }}
              >
                Verifica la connessione internet o prova a ricaricare la pagina
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default GPSChart;
