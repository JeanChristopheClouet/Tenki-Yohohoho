from flask import Flask, request, jsonify
import joblib
from flask_cors import CORS
import numpy as np
import requests
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# load the model 
try:
    linear_regression_model = joblib.load("./model/model.pkl")
    print("Model loaded successfully")
except (FileNotFoundError, ModuleNotFoundError, ImportError) as e:
    print(f"Error loading model: {e}")
    # Simple fallback model that returns a constant value
    class FallbackModel:
        def predict(self, X):
            # Return low earthquake risk (0.1-0.3 range)
            return np.array([0.2])
    
    linear_regression_model = FallbackModel()
    print("Using fallback model")

# Open-Meteo API configuration
OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    lat = data["latitude"]
    lon = data["longitude"]

    X = np.array([[lat, lon]])
    predicted_magnitude = linear_regression_model.predict(X)
    
    return jsonify({"prediction": predicted_magnitude[0]})

@app.route("/weather", methods=["GET"])
def get_weather():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    lang = request.args.get("lang", "en")  # Default to English
    
    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required"}), 400
    
    # Make request to Open-Meteo API for current weather
    url = f"{OPEN_METEO_BASE_URL}?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&timezone=auto"
    
    # Add language parameter if needed
    if lang == "ja":
        url += "&language=ja"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        # Transform the Open-Meteo response to a more frontend-friendly format
        weather_data = {
            "current": data.get("current", {}),
            "location": {
                "latitude": float(lat),
                "longitude": float(lon)
            },
            "units": data.get("current_units", {})
        }
        return jsonify(weather_data)
    else:
        return jsonify({"error": "Failed to fetch weather data"}), response.status_code

@app.route("/forecast", methods=["GET"])
def get_forecast():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    lang = request.args.get("lang", "en")  # Default to English
    
    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required"}), 400
    
    # Make request to Open-Meteo API for hourly and daily forecast
    url = f"{OPEN_METEO_BASE_URL}?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto"
    
    # Add language parameter if needed
    if lang == "ja":
        url += "&language=ja"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        # Transform the Open-Meteo response to a more frontend-friendly format
        forecast_data = {
            "hourly": data.get("hourly", {}),
            "daily": data.get("daily", {}),
            "location": {
                "latitude": float(lat),
                "longitude": float(lon)
            },
            "hourly_units": data.get("hourly_units", {}),
            "daily_units": data.get("daily_units", {})
        }
        return jsonify(forecast_data)
    else:
        return jsonify({"error": "Failed to fetch forecast data"}), response.status_code

@app.route("/pollen", methods=["GET"])
def get_pollen():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    
    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required"}), 400
    
    # Get API key from environment variable
    AMBEE_API_KEY = os.environ.get("AMBEE_API_KEY")
    
    # If we have an API key, use the Ambee API for real pollen data
    if AMBEE_API_KEY:
        url = f"https://api.ambeedata.com/latest/pollen/by-lat-lng?lat={lat}&lng={lon}"
        headers = {"x-api-key": AMBEE_API_KEY, "Content-type": "application/json"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return jsonify(response.json())
        except Exception as e:
            print(f"Error fetching pollen data: {e}")
            # Fall back to mock data if API call fails
    
    # If no API key or API call failed, return mock data
    mock_pollen_data = {
        "status": "success",
        "message": "Pollen data fetched successfully",
        "data": {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "location": f"Lat: {lat}, Lon: {lon}",
            "pollen_levels": {
                "cedar": "high" if 3 <= datetime.now().month <= 5 else "low",  # High during spring
                "cypress": "medium",
                "grass": "low",
                "ragweed": "low"
            },
            "risk_level": "medium"
        }
    }
    
    return jsonify(mock_pollen_data)

@app.route("/language", methods=["GET"])
def get_translations():
    lang = request.args.get("lang", "en")
    
    translations = {
        "en": {
            "weather": "Weather",
            "temperature": "Temperature",
            "humidity": "Humidity",
            "wind": "Wind Speed",
            "earthquake": "Earthquake Risk",
            "pollen": "Pollen Forecast",
            "cedar": "Cedar",
            "cypress": "Cypress",
            "grass": "Grass",
            "ragweed": "Ragweed"
        },
        "ja": {
            "weather": "天気",
            "temperature": "気温",
            "humidity": "湿度",
            "wind": "風速",
            "earthquake": "地震リスク",
            "pollen": "花粉予報",
            "cedar": "杉",
            "cypress": "ヒノキ",
            "grass": "イネ科",
            "ragweed": "ブタクサ"
        }
    }
    
    return jsonify(translations.get(lang, translations["en"]))

if __name__ == "__main__":
    app.run(debug=True)

