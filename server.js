const express = require('express');
const cookieParser = require('cookie-parser');
const {createClient } = require('redis');
const calculateData = require("./calculateData");
const portNr = 3000;
const app = express();
const ttl = 60; //time to live van de cache is 60 seconden (1 minuut)
const redisClient = createClient({
    url: 'redis://redis-service:6379'
});
let environmentVariables = {};

async function initRedis() {
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.connect();
}

//initRedis();
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    if (req.path === "/" || req.path === "/index.html" || req.path === "/planting/" || req.path === "/planting/index.html" || req.path === "/fertilizing/" || req.path === "/fertilizing/index.html" || req.path === "/harvesting/" || req.path === "/harvesting/index.html" || req.path === "/heat/" || req.path === "/heat/index.html" || req.path === "/irrigation/" || req.path === "/irrigation/index.html" || req.path === "/spraying/" || req.path === "/spraying/index.html") {
        const sessionId = req.cookies.sessionID;
        if(!sessionId) {
            console.log("[REDIRECT] Gebruiker is niet ingelogd, doorsturen naar login.");
            return res.redirect(302, "/login");
        }
    }
    next();
})

app.use(express.static('public'));

app.get('/api/v1/data', async (req, res) => {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    const produce = req.query.produce;
    const authHeader = req.headers['authorization'];

    console.log(authHeader);

    const cacheKey = `${latitude}_${longitude}_${produce}`;

    const cachedData = undefined //await redisClient.get(cacheKey);

    if (cachedData != undefined) {
        console.log(`[CACHE HIT] Data voor ${cacheKey} gevonden!`)
        return res.json(JSON.parse(cachedData));
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
        
        //await redisClient.setEx(cacheKey, ttl, JSON.stringify(calculateData(data, produce)));
        console.log(`[API FETCH] Data voor ${cacheKey} opgehaald van API`);

        res.json(calculateData(data, produce));
    }
    catch (error) {
        console.error("Dat ging niet helemaal lekker", error);
        res.status(500).json({ error: "Helaas konden wij de api data niet ophalen (volgende keer beter!)" });
    }

});

app.post("/api/v1/register", async (req, res) => {
    console.log(req.body.username, req.body.email, req.body.password);
    return res.status(200).json({ sessionID: "sess_" + Math.random().toString(36).substring(2, 15)});
})

app.listen(portNr, () => {
    console.log(`== Server online ==\nURL: http://127.0.0.1${portNr == 80 ? '' : `:${portNr}`}\nIP: 127.0.0.1/\nPort: ${portNr}\nAPI: http://127.0.0.1${portNr == 80 ? '' : `:${portNr}`}/api/v1/data`)
})