const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&daily=temperature_2m_min,precipitation_sum,precipitation_probability_max&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,soil_temperature_6cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_1_to_3cm,weather_code,precipitation_probability,snowfall,snow_depth&models=best_match&timezone=Europe%2FBerlin&forecast_days=14';
const portNr = 3000;
const app = express();
