import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix marker icon issues in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Japan's geographic bounds based on the model training data
const JAPAN_BOUNDS = [
  [24, 122], // Southwest corner [lat, lng]
  [46, 146]  // Northeast corner [lat, lng]
];

// Center of Japan for initial map view
const JAPAN_CENTER = [36.2048, 138.2529];

// Function to fetch weather data from our API
const fetchWeatherData = async (lat, lng) => {
  try {
    const response = await fetch(`http://localhost:5000/weather?lat=${lat}&lon=${lng}`);
    if (!response.ok) throw new Error('Weather data fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
};

// Function to fetch earthquake prediction from our API
const fetchEarthquakePrediction = async (lat, lng) => {
  try {
    const response = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    if (!response.ok) throw new Error('Earthquake prediction fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Error fetching earthquake prediction:', error);
    return null;
  }
};

// Function to fetch pollen data from our API
const fetchPollenData = async (lat, lng) => {
  try {
    const response = await fetch(`http://localhost:5000/pollen?lat=${lat}&lon=${lng}`);
    if (!response.ok) throw new Error('Pollen data fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Error fetching pollen data:', error);
    return null;
  }
};

// Component to enforce map bounds
function SetBoundsRectangles() {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // Set max bounds to prevent panning away from Japan
    map.setMaxBounds(JAPAN_BOUNDS);
    
    // Add a rectangle to show Japan's bounds
    const rectangle = L.rectangle(JAPAN_BOUNDS, {
      color: "#ff7800",
      weight: 1,
      fillOpacity: 0.05
    }).addTo(map);
    
    return () => {
      map.removeLayer(rectangle);
    };
  }, [map]);
  
  return null;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
  const map = useMapEvents({
    click: (e) => {
      onMapClick(e);
    },
  });
  
  return null;
}

function JapanMap() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [earthquakePrediction, setEarthquakePrediction] = useState(null);
  const [pollenData, setPollenData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    setSelectedLocation({ lat, lng });
    setLoading(true);
    
    // Fetch data in parallel
    const [weather, earthquake, pollen] = await Promise.all([
      fetchWeatherData(lat, lng),
      fetchEarthquakePrediction(lat, lng),
      fetchPollenData(lat, lng)
    ]);
    
    setWeatherData(weather);
    setEarthquakePrediction(earthquake);
    setPollenData(pollen);
    setLoading(false);
  };
  
  return (
    <div className="map-container" style={{ height: '80vh', width: '100%' }}>
      <MapContainer
        center={JAPAN_CENTER}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetBoundsRectangles />
        <MapClickHandler onMapClick={handleMapClick} />
        
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
            <Popup>
              <div>
                <h3>Weather Information</h3>
                {loading ? (
                  <p>Loading data...</p>
                ) : (
                  <>
                    <div>
                      <h4>Location</h4>
                      <p>Latitude: {selectedLocation.lat.toFixed(4)}</p>
                      <p>Longitude: {selectedLocation.lng.toFixed(4)}</p>
                    </div>
                    
                    {weatherData && weatherData.current && (
                      <div>
                        <h4>Weather</h4>
                        <p>Temperature: {weatherData.current.temperature_2m}°C</p>
                        <p>Humidity: {weatherData.current.relative_humidity_2m}%</p>
                        <p>Wind Speed: {weatherData.current.wind_speed_10m} km/h</p>
                      </div>
                    )}
                    
                    {earthquakePrediction && (
                      <div>
                        <h4>Earthquake Risk</h4>
                        <p>Predicted Magnitude: {earthquakePrediction.prediction.toFixed(2)}</p>
                      </div>
                    )}
                    
                    {pollenData && pollenData.data && (
                      <div>
                        <h4>Pollen Forecast</h4>
                        <p>Cedar: {pollenData.data.pollen_levels.cedar}</p>
                        <p>Cypress: {pollenData.data.pollen_levels.cypress}</p>
                        <p>Overall Risk: {pollenData.data.risk_level}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default JapanMap; 