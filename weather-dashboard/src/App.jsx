import { useState, useEffect } from "react";
import "./App.css";
import bgImage from "../image.jpg";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

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

function celsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

function formatLocation(location) {
  const parts = [location.name];
  if (location.country_code === "US" && location.admin1) {
    parts.push(location.admin1);
  }
  if (location.country) {
    parts.push(location.country);
  }
  return parts.filter(Boolean).join(", ");
}

function formatLocalTime(dateTimeString, timeZone) {
  if (!dateTimeString) {
    return "Time unavailable";
  }

  const date = new Date(dateTimeString);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function isCountryResult(location, query) {
  if (!(location?.name && location?.country)) {
    return false;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedName = location.name.trim().toLowerCase();
  const normalizedCountry = location.country.trim().toLowerCase();

  return (
    (normalizedName === normalizedCountry && !location.admin1) ||
    normalizedQuery === normalizedCountry
  );
}

function isExactCityMatch(location, query) {
  if (!(location?.name && query)) {
    return false;
  }

  return location.name.trim().toLowerCase() === query.trim().toLowerCase();
}

function getMapUrl(latitude, longitude) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=10&size=620x260&markers=${latitude},${longitude},red-pushpin`;
}

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const overlay = "linear-gradient(180deg, rgba(10, 18, 45, 0.72), rgba(14, 28, 70, 0.72))";
    document.documentElement.style.backgroundImage = `${overlay}, url('${bgImage}')`;
    document.documentElement.style.backgroundSize = "cover";
    document.documentElement.style.backgroundPosition = "center";
    document.documentElement.style.backgroundRepeat = "no-repeat";
    document.documentElement.style.backgroundAttachment = "fixed";

    return () => {
      document.documentElement.style.backgroundImage = "";
      document.documentElement.style.backgroundSize = "";
      document.documentElement.style.backgroundPosition = "";
      document.documentElement.style.backgroundRepeat = "";
      document.documentElement.style.backgroundAttachment = "";
    };
  }, []);

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
        setError("Must be a real CITY you donut");
        setLoading(false);
        return;
      }

      const location = geoData.results[0];

      if (!isExactCityMatch(location, city) || isCountryResult(location, city)) {
        setError("Must be a real CITY you donut");
        setLoading(false);
        return;
      }

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
      );

      const weatherData = await weatherResponse.json();
      const resolvedTimeZone = weatherData.timezone || location.timezone || "UTC";

      setWeather({
        displayName: formatLocation(location),
        country: location.country,
        countryCode: location.country_code,
        region: location.admin1 || location.country,
        locality: location.admin2 || location.admin1 || "N/A",
        timezone: resolvedTimeZone,
        latitude: location.latitude,
        longitude: location.longitude,
        elevation: location.elevation ?? "N/A",
        population: location.population ?? "N/A",
        mapUrl: getMapUrl(location.latitude, location.longitude),
        temperature: celsiusToFahrenheit(weatherData.current.temperature_2m),
        humidity: weatherData.current.relative_humidity_2m,
        wind: weatherData.current.wind_speed_10m,
        code: weatherData.current.weather_code,
        currentTime: weatherData.current.time,
        currentTimeLabel: formatLocalTime(weatherData.current.time, resolvedTimeZone),
      });
    } catch {
      setError("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <div className="container">
      <h1>Weather</h1>
      <p className="tagline">Search any city to view the latest forecast, local time, and map.</p>

      <form
        className="search-wrapper"
        onSubmit={(event) => {
          event.preventDefault();
          getWeather();
        }}
      >
        <input
          type="text"
          placeholder="Enter a city, state or city and country"
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
            if (error) setError("");
          }}
          disabled={loading}
          aria-label="City search"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {loading && <p className="loading">Loading weather...</p>}

      {error && <p className="error">{error}</p>}

      {weather && (
        <div className="card">
          <h2>{weather.displayName}</h2>
          <p className="subheading">
            {weather.locality ? `${weather.locality}, ` : ""}
            {weather.region} · {weather.country}
          </p>
          <p className="timezone-meta">
            <span>🕒 {weather.timezone}</span>
            <span>• {weather.currentTimeLabel}</span>
          </p>

          <div className="leaflet-map-wrapper">
            <MapContainer
              center={[weather.latitude, weather.longitude]}
              zoom={10}
              style={{
                height: "320px",
                width: "100%",
                borderRadius: "20px",
              }}
              scrollWheelZoom={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              <Marker position={[weather.latitude, weather.longitude]} />
            </MapContainer>
          </div>

          <div className="weather-summary">
            <div className="icon">
              {getWeatherInfo(weather.code).icon}
            </div>
            <div>
              <p className="weather-text">{getWeatherInfo(weather.code).text}</p>
              <div className="temperature-display">
                {weather.temperature}°F
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <p><strong>Humidity</strong></p>
              <p>{weather.humidity}%</p>
            </div>
            <div>
              <p><strong>Wind Speed</strong></p>
              <p>{weather.wind} km/h</p>
            </div>
            <div>
              <p><strong>Latitude</strong></p>
              <p>{weather.latitude.toFixed(4)}</p>
            </div>
            <div>
              <p><strong>Longitude</strong></p>
              <p>{weather.longitude.toFixed(4)}</p>
            </div>
            <div>
              <p><strong>Elevation</strong></p>
              <p>{weather.elevation}</p>
            </div>
            <div>
              <p><strong>Population</strong></p>
              <p>{weather.population}</p>
            </div>
            <div>
              <p><strong>Weather Code</strong></p>
              <p>{weather.code}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;