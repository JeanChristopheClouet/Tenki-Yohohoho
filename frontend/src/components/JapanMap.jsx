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

// Translations for the component
const translations = {
  en: {
    weatherInfo: "🌦️ Weather Information",
    loading: "Loading data...",
    location: "📍 Location",
    latitude: "🔹 Latitude",
    longitude: "🔹 Longitude",
    weather: "☀️ Weather",
    temperature: "🌡️ Temperature",
    humidity: "💧 Humidity",
    windSpeed: "💨 Wind Speed",
    earthquakeRisk: "🌋 Earthquake Risk",
    predictedMagnitude: "📊 Predicted Magnitude",
    pollenForecast: "🌸 Pollen Forecast",
    cedar: "🌲 Cedar",
    cypress: "🌳 Cypress",
    overallRisk: "⚠️ Overall Risk",
    outsideJapan: "⛔ This location is outside Japanese territory. Data is only available for Japan.",
    dataError: "❌ Error retrieving data. Please try another location.",
    high: "High",
    medium: "Medium",
    low: "Low",
    date: "📅 Date",
    today: "Today",
    noData: "ℹ️ No detailed pollen data available",
    mapLegend: "Map Legend",
    viewableArea: "Viewable Area (data for Japan only)"
  },
  ja: {
    weatherInfo: "🌦️ 天気情報",
    loading: "データを読み込み中...",
    location: "📍 場所",
    latitude: "🔹 緯度",
    longitude: "🔹 経度",
    weather: "☀️ 天気",
    temperature: "🌡️ 気温",
    humidity: "💧 湿度",
    windSpeed: "💨 風速",
    earthquakeRisk: "🌋 地震リスク",
    predictedMagnitude: "📊 予測マグニチュード",
    pollenForecast: "🌸 花粉予報",
    cedar: "🌲 杉",
    cypress: "🌳 ヒノキ",
    overallRisk: "⚠️ 総合リスク",
    outsideJapan: "⛔ この場所は日本国外です。データは日本国内のみ利用可能です。",
    dataError: "❌ データの取得中にエラーが発生しました。別の場所を試してください。",
    high: "高い",
    medium: "中程度",
    low: "低い",
    date: "📅 日付",
    today: "今日",
    noData: "ℹ️ 詳細な花粉データは利用できません",
    mapLegend: "地図の凡例",
    viewableArea: "表示領域（日本国内のみデータ表示）"
  }
};

// Check if coordinates are within Japan bounds
const isWithinJapanBounds = (lat, lng) => {
  // First check if within the larger rectangular bounds
  const withinRectangle = (
    lat >= JAPAN_BOUNDS[0][0] && lat <= JAPAN_BOUNDS[1][0] &&
    lng >= JAPAN_BOUNDS[0][1] && lng <= JAPAN_BOUNDS[1][1]
  );
  
  if (!withinRectangle) return false;
  
  // Now exclude known non-Japanese regions within the rectangle
  
  // Korean Peninsula (North and South Korea)
  if (lng >= 122 && lng <= 129 && lat >= 34 && lat <= 43) {
    // This is a simplified boundary for Korean Peninsula
    return false;
  }
  
  // China (northeastern provinces including Heilongjiang)
  if (lng >= 122 && lng < 130 && lat >= 43 && lat <= 53) {
    // Northeastern China (parts north of Korea)
    return false; 
  }
  
  // Eastern Russia (Sakhalin Island)
  if (lng >= 142 && lng <= 146 && lat >= 45.8 && lat <= 46) {
    // Simplified boundary for parts of Eastern Russia
    return false;
  }
  
  // Additional Sakhalin Island coverage (northern parts)
  if (lng >= 142 && lng <= 144 && lat > 46 && lat <= 55) {
    // Northern Sakhalin
    return false;
  }
  
  // Eastern Russia (Far eastern disputed area)
  if (lng >= 146 && lng <= 146 && lat >= 43 && lat <= 44) {
    // Far eastern edge outside Japanese territory
    return false;
  }
  
  // Far northern disputed islands
  if (lng >= 145.8 && lng <= 146 && lat > 45.5 && lat < 46) {
    // These are disputed territories
    return false;
  }
  
  // Primorsky Krai (Russian mainland)
  if (lng >= 130 && lng < 139 && lat >= 42.5 && lat <= 48) {
    return false;
  }
  
  // Mainland China (adjusted for southern Japan)
  if (lng >= 122 && lng <= 129 && lat >= 18 && lat < 34) {
    // China but not affecting southern Japan
    return false;
  }
  
  // Far western parts (Taiwan area)
  if (lng >= 122 && lng <= 124 && lat >= 24 && lat <= 26) {
    return false;
  }
  
  // Return true only if within rectangle and not in excluded regions
  return true;
};

// Function to fetch weather data from our API
const fetchWeatherData = async (lat, lng, lang) => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const response = await fetch(`${API_URL}/weather?lat=${lat}&lon=${lng}&lang=${lang}`);
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
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    if (!response.ok) throw new Error('Earthquake prediction fetch failed');
    const data = await response.json();
    
    // Check if prediction property exists and is a number
    if (typeof data.prediction !== 'number') {
      throw new Error('Invalid prediction data');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching earthquake prediction:', error);
    return null;
  }
};

// Function to fetch pollen data from our API
const fetchPollenData = async (lat, lng) => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const response = await fetch(`${API_URL}/pollen?lat=${lat}&lon=${lng}`);
    if (!response.ok) throw new Error('Pollen data fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Error fetching pollen data:', error);
    return null;
  }
};

// Component to add Japan boundary rectangle and enforce map bounds
function JapanBoundaryRectangle({ language = 'en' }) {
  const map = useMap();
  
  // Get translations based on language
  const t = translations[language] || translations.en;
  
  useEffect(() => {
    if (!map) return;
    
    // Add a rectangle to show Japan's bounds
    const rectangle = L.rectangle(JAPAN_BOUNDS, {
      color: "#ff7800",
      weight: 2,
      fillOpacity: 0.05,
      dashArray: '5, 5' // Make it a dashed line for better visibility
    }).addTo(map);
    
    // Strictly enforce bounds to Japan area
    map.setMaxBounds(JAPAN_BOUNDS);
    map.on('drag', function() {
      map.panInsideBounds(JAPAN_BOUNDS, { animate: false });
    });
    
    // Add a legend to explain the map
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
      const div = L.DomUtil.create('div', 'info legend');
      div.innerHTML = `
        <div style="background-color: white; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
          <div style="margin-bottom: 5px;"><strong>${t.mapLegend}</strong></div>
          <div style="display: flex; align-items: center;">
            <div style="width: 15px; height: 1px; background-color: #ff7800; 
                 margin-right: 5px; border: 1px dashed #ff7800;"></div>
            <span>${t.viewableArea}</span>
          </div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);
    
    return () => {
      map.removeLayer(rectangle);
      map.removeControl(legend);
      map.off('drag');
    };
  }, [map, language, t]);
  
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

function JapanMap({ language = 'en' }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [earthquakePrediction, setEarthquakePrediction] = useState(null);
  const [pollenData, setPollenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOutsideJapan, setIsOutsideJapan] = useState(false);
  
  // Get translations based on language
  const t = translations[language] || translations.en;
  
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    
    // Reset states
    setError(null);
    setWeatherData(null);
    setEarthquakePrediction(null);
    setPollenData(null);
    
    // Always set selected location for the marker
    setSelectedLocation({ lat, lng });
    
    // Check if click is within Japan bounds for data fetching
    if (isWithinJapanBounds(lat, lng)) {
      setIsOutsideJapan(false);
      setLoading(true);
      
      try {
        // Fetch data in parallel
        const [weather, earthquake, pollen] = await Promise.all([
          fetchWeatherData(lat, lng, language),
          fetchEarthquakePrediction(lat, lng),
          fetchPollenData(lat, lng)
        ]);
        
        // Check if any of the fetches failed
        if (!weather || !earthquake || !pollen) {
          setError(t.dataError);
        } else {
          setWeatherData(weather);
          setEarthquakePrediction(earthquake);
          setPollenData(pollen);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(t.dataError);
      } finally {
        setLoading(false);
      }
    } else {
      // Handle click outside Japan
      setIsOutsideJapan(true);
      console.log("Click outside Japan boundary - no data available");
    }
  };
  
  return (
    <div className="map-wrapper">
      <div className="map-container">
        <MapContainer
          center={JAPAN_CENTER}
          zoom={7}
          minZoom={4} // Restrict zoom out to keep Japan visible
          maxZoom={12} // Allow reasonable zoom in
          maxBoundsViscosity={1.0} // Strict bounds enforcement
          maxBounds={JAPAN_BOUNDS} // Apply bounds at container level too
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <JapanBoundaryRectangle language={language} />
          <MapClickHandler onMapClick={handleMapClick} />
          
          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
              <Popup>
                <div className="popup-content" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <h3>{t.weatherInfo}</h3>
                  
                  {loading && (
                    <p>{t.loading}</p>
                  )}
                  
                  {error && !loading && (
                    <p className="error-message">{error}</p>
                  )}
                  
                  {isOutsideJapan && !loading && (
                    <p className="error-message">{t.outsideJapan}</p>
                  )}
                  
                  {!loading && !error && !isOutsideJapan && (
                    <div className="popup-grid">
                      <div>
                        <h4>{t.location}</h4>
                        <p>{t.latitude}: {selectedLocation.lat.toFixed(4)}</p>
                        <p>{t.longitude}: {selectedLocation.lng.toFixed(4)}</p>
                      </div>
                      
                      {weatherData && weatherData.current && (
                        <div>
                          <h4>{t.weather}</h4>
                          <p>{t.temperature}: {weatherData.current.temperature_2m}°C</p>
                          <p>{t.humidity}: {weatherData.current.relative_humidity_2m}%</p>
                          <p>{t.windSpeed}: {weatherData.current.wind_speed_10m} km/h</p>
                        </div>
                      )}
                      
                      {earthquakePrediction && typeof earthquakePrediction.prediction === 'number' && (
                        <div>
                          <h4>{t.earthquakeRisk}</h4>
                          <p>{t.predictedMagnitude}: {earthquakePrediction.prediction.toFixed(2)}</p>
                        </div>
                      )}
                      
                      {pollenData && (
                        <div>
                          <h4>{t.pollenForecast}</h4>
                          {pollenData.data && pollenData.data.pollen_levels ? (
                            <>
                              <p>{t.cedar}: {pollenData.data.pollen_levels.cedar === 'high' ? t.high : 
                                                    pollenData.data.pollen_levels.cedar === 'medium' ? t.medium : 
                                                    pollenData.data.pollen_levels.cedar === 'low' ? t.low : 
                                                    pollenData.data.pollen_levels.cedar || 'Unknown'}</p>
                              <p>{t.cypress}: {pollenData.data.pollen_levels.cypress === 'high' ? t.high : 
                                                      pollenData.data.pollen_levels.cypress === 'medium' ? t.medium : 
                                                      pollenData.data.pollen_levels.cypress === 'low' ? t.low : 
                                                      pollenData.data.pollen_levels.cypress || 'Unknown'}</p>
                              <p>{t.overallRisk}: {pollenData.data.risk_level === 'high' ? t.high : 
                                                     pollenData.data.risk_level === 'medium' ? t.medium : 
                                                     pollenData.data.risk_level === 'low' ? t.low : 
                                                     pollenData.data.risk_level || 'Unknown'}</p>
                              <p><small>{t.date}: {pollenData.data.date || t.today}</small></p>
                            </>
                          ) : (
                            <p>{t.noData}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default JapanMap; 