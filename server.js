const express = require('express');
const nodeCache = require('node-cache');
const portNr = 3000;
const app = express();
const ttl = 60; //time to live van de cache is 1800 seconden (30 minuten)

const weatherCache = new nodeCache({stdTTL: ttl});

app.use(express.static('public'));

app.get('/api/v1/data', async (req, res) => {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;

    const cacheKey = `${latitude}_${longitude}`;

    const cachedData = weatherCache.get(cacheKey);

    if (cachedData != undefined) {
        console.log(`[CACHE HIT] Data voor ${cacheKey} gevonden!`)
        return res.json(cachedData);
    }


    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_min,precipitation_sum,precipitation_probability_max&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,soil_temperature_6cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_1_to_3cm,weather_code,precipitation_probability,snowfall,snow_depth&models=best_match&timezone=Europe%2FBerlin&forecast_days=14`;

    const response = await fetch(apiUrl);

    try {


        if (!response.ok) {
            const data = await response.json();
            if(data.error == true) {
                throw new Error(data.reason);
            }
            throw new Error("jammer de bammer")
        }

        const data = await response.json();

        weatherCache.set(cacheKey, data);
        console.log(`[API FETCH] Data voor ${cacheKey} opgehaald van API`);

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