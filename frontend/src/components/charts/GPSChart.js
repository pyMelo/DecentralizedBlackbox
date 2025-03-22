import React, { useState } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  Circle 
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix per le icone di Leaflet
// Nota: Dovrai avere questi file nella cartella public
const DefaultIcon = L.icon({
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

const GPSMap = ({ data, darkMode = false }) => {
  const [showInfo, setShowInfo] = useState(false);
  
  // Calcola il centro della mappa (media di lat e long)
  const centerLat = data.length > 0 
    ? data.reduce((sum, item) => sum + item.latitude, 0) / data.length 
    : 45.4642; // Default a una posizione in Italia se non ci sono dati
  
  const centerLong = data.length > 0 
    ? data.reduce((sum, item) => sum + item.longitude, 0) / data.length 
    : 9.1900; // Default a una posizione in Italia se non ci sono dati
  
  // Calcola il raggio per determinare lo zoom della mappa
  const calcRadius = () => {
    if (data.length <= 1) return 500; // metri
    
    let maxDist = 0;
    data.forEach(item => {
      const dist = Math.sqrt(
        Math.pow(item.latitude - centerLat, 2) + 
        Math.pow(item.longitude - centerLong, 2)
      ) * 111000; // Conversione approssimativa da gradi a metri (1 grado = ~111km)
      
      if (dist > maxDist) maxDist = dist;
    });
    
    return Math.max(maxDist * 1.2, 500); // Assicura un minimo di raggio
  };
  
  const radius = calcRadius();
  
  // Determina lo zoom in base al raggio
  const getZoomLevel = (radiusInMeters) => {
    const zoom = Math.log2(40000000 / radiusInMeters);
    return Math.min(Math.max(Math.round(zoom), 1), 18); // Limita lo zoom tra 1 e 18
  };
  
  const zoom = getZoomLevel(radius);

  // Crea le coordinate per la polyline dai punti GPS
  const polylinePositions = data.map(point => [point.latitude, point.longitude]);

  // Stili per il componente
  const styles = {
    card: {
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      backgroundColor: darkMode ? '#1e1e2f' : 'white',
      color: darkMode ? 'white' : 'black',
      overflow: 'hidden'
    },
    cardHeader: {
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
    },
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    iconButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      borderRadius: '4px',
      padding: '4px',
      color: darkMode ? 'white' : 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    cardContent: {
      padding: '16px'
    },
    infoBox: {
      marginBottom: '16px',
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    },
    infoTitle: {
      fontSize: '14px',
      fontWeight: 600,
      marginBottom: '8px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    infoLabel: {
      fontSize: '12px',
      color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      marginBottom: '4px'
    },
    infoValue: {
      fontSize: '14px',
      display: 'flex',
      gap: '8px'
    },
    bold: {
      fontWeight: 600
    },
    mapContainer: {
      height: '300px',
      width: '100%',
      borderRadius: '8px',
      overflow: 'hidden'
    }
  };

  // Icone SVG inline
  const NavigationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
      stroke={darkMode ? 'white' : 'black'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
    </svg>
  );

  const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );

  const MapPinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" 
      stroke="#6441A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  );

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.title}>
          <NavigationIcon />
          Mappa GPS
        </h3>
        <button 
          style={styles.iconButton} 
          onClick={() => setShowInfo(!showInfo)}
          title="Mostra statistiche"
        >
          <InfoIcon />
        </button>
      </div>
      <div style={styles.cardContent}>
        {showInfo && (
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>Informazioni GPS</h4>
            
            <div style={styles.infoGrid}>
              <div>
                <p style={styles.infoLabel}>Posizione Media</p>
                <div style={styles.infoValue}>
                  <p>
                    <span style={styles.bold}>Lat:</span> {centerLat.toFixed(6)}
                  </p>
                  <p>
                    <span style={styles.bold}>Long:</span> {centerLong.toFixed(6)}
                  </p>
                </div>
              </div>
              
              <div>
                <p style={styles.infoLabel}>Campioni</p>
                <p style={styles.infoValue}>
                  <span style={styles.bold}>{data.length}</span> punti rilevati
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Mappa Leaflet */}
        <div style={styles.mapContainer}>
          <MapContainer 
            center={[centerLat, centerLong]} 
            zoom={zoom} 
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Punto centrale */}
            <Marker position={[centerLat, centerLong]}>
              <Popup>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontWeight: 600, fontSize: "14px" }}>
                    Posizione Media
                  </p>
                  <p style={{ fontSize: "12px" }}>
                    Lat: {centerLat.toFixed(6)}
                  </p>
                  <p style={{ fontSize: "12px" }}>
                    Long: {centerLong.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
            
            {/* Cerchio di riferimento */}
            <Circle 
              center={[centerLat, centerLong]}
              radius={radius}
              pathOptions={{ 
                color: "#6441A5", 
                fillColor: "#6441A5", 
                fillOpacity: 0.1 
              }}
            />
            
            {/* Polyline che collega tutti i punti */}
            {data.length > 1 && (
              <Polyline 
                positions={polylinePositions}
                pathOptions={{ 
                  color: "#6441A5", 
                  weight: 3,
                  opacity: 0.7,
                  dashArray: "5, 5"
                }}
              />
            )}
            
            {/* Tutti i punti GPS */}
            {data.map((point, index) => (
              <Marker 
                key={index} 
                position={[point.latitude, point.longitude]}
                icon={L.divIcon({
                  html: `<div style="
                    background-color: #6441A5;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 0 4px rgba(0,0,0,0.3);
                  "></div>`,
                  className: "",
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                })}
              >
                <Popup>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                      Posizione
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                      <MapPinIcon />
                      <p style={{ fontSize: "12px" }}>
                        <span style={{ fontWeight: 600 }}>Lat:</span> {point.latitude}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPinIcon />
                      <p style={{ fontSize: "12px" }}>
                        <span style={{ fontWeight: 600 }}>Long:</span> {point.longitude}
                      </p>
                    </div>
                    {point.time && (
                      <p style={{ 
                        fontSize: "10px", 
                        marginTop: "8px", 
                        opacity: 0.7 
                      }}>
                        {point.time}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default GPSMap;
