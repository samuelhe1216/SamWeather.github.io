import { useState } from "react";
import "./App.css";

function getWeatherInfo(code) {
  if (code === 0) return { icon: "☀️", text: "Clear Sky" };
  if (code === 1 || code === 2) return { icon: "⛅", text: "Partly Cloudy" };
  if (code === 3) return { icon: "☁️", text: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", text: "Foggy" };
  if (code >= 51 && code <= 67) return { icon: "🌧️", text: "Rainy" };
  if (code >= 71 && code <= 77) return { icon: "❄️", text: "Snowy" };
  if (code === 80 || code === 81 || code === 82) return { icon: "🌧️", text: "Rain Showers" };
  if (code === 85 || code === 86) return { icon: "❄️", text: "Snow Showers" };
  if (code >= 95 && code <= 99) return { icon: "⛈️", text: "Thunderstorm" };

  return { icon: "🌍", text: "Unknown" };
}

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function getWeather() {
    if (!city.trim()) return;

    setLoading(true);
    setError("");
    setWeather(null);

    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
      );

      const geoData = await geoResponse.json();

      if (!geoData.results) {
        setError("City not found.");
        setLoading(false);
        return;
      }

      const location = geoData.results[0];

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
      );

      const weatherData = await weatherResponse.json();

      setWeather({
        city: location.name,
        temperature: weatherData.current.temperature_2m,
        humidity: weatherData.current.relative_humidity_2m,
        wind: weatherData.current.wind_speed_10m,
        code: weatherData.current.weather_code,
      });
    } catch {
      setError("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <div className="container">
      <h1>Weather</h1>
      <p className="tagline">Type a city and state to get the latest forecast.</p>

      <div className="search-wrapper">
        <input
          type="text"
          placeholder="Enter a city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && getWeather()}
        />

        <button onClick={getWeather}>Search</button>
      </div>

      {loading && <p className="loading">Loading weather...</p>}

      {error && <p className="error">{error}</p>}

      {weather && (
        <div className="card">
          <h2>{weather.city}</h2>

          <div className="icon">
            {getWeatherInfo(weather.code).icon}
          </div>

          <p>
            {getWeatherInfo(weather.code).text}
          </p>

          <div className="temperature-display">
            {weather.temperature}°C
          </div>

          <p>
            <strong>Humidity:</strong> {weather.humidity}%
          </p>

          <p>
            <strong>Wind Speed:</strong> {weather.wind} km/h
          </p>
        </div>
      )}
    </div>
  );
}

export default App;