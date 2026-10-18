const express = require('express');
const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&daily=temperature_2m_min,precipitation_sum,precipitation_probability_max&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,soil_temperature_6cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_1_to_3cm,weather_code,precipitation_probability,snowfall,snow_depth&models=best_match&timezone=Europe%2FBerlin&forecast_days=14';
const portNr = 80;
const app = express();
app.use(express.static('public'));

app.get('/api/v1/data', async (req, res) => {
    const response = await fetch(apiUrl);

    try {

        if (!response.ok) {
            throw new Error('jammer de bammer');
        }

        const data = await response.json();

        res.json(data);
    }
    catch (error) {
        console.error("Dat ging niet helemaal lekker", error);
        res.status(500).json({ error: "Helaas konden wij de api data niet ophalen (volgende keer beter!)" });
    }

});

app.listen(portNr, () => {
    console.log(`== Server online ==\nURL: http://127.0.0.1${portNr == 80 ? '' : `:${portNr}`}\nIP: 127.0.0.1/\nPort: ${portNr}\nAPI: http://127.0.0.1${portNr == 80 ? '' : `:${portNr}`}/api/v1/data`)
})