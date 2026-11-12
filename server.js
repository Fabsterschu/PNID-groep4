const express = require('express');
const cookieParser = require('cookie-parser');
const {createClient } = require('redis');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const crypto = require('crypto');
const calculateData = require("./calculateData");
const portNr = 3000;
const app = express();
const ttl = 60; //time to live van de cache is 60 seconden (1 minuut)
const sessionTtl = 100000;
const redisClient = createClient({
    url: 'redis://redis-service:6379'
});

async function initRedis() {
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.connect();
}

initRedis();
app.use(express.json());
app.use(cookieParser());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
})

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
    let isAuthenticated = false;

    const sessionId = req.cookies.sessionID;
    const authHeader = req.headers['authorization']; //gaat eruit zien als "api-key tm_key_9uidsagfu9di989gdsh98kjlk"
    let apiKey;

    if (!authHeader && !sessionId) {
        return res.status(401).json({ error: "Niet geautoriseerd." });
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
        apiKey = authHeader.substring(7);
    } else if (authHeader) {
        return res.status(401).json({ error: "API key is verkeerd geformuleerd" });
    }

    try {
        if (apiKey) {
            apiKey = apiKey.trim();
            const apiKeyQuery = `SELECT id FROM users WHERE api_key = $1`;

            const result = await pool.query(apiKeyQuery, [apiKey]);

            if (result.rows.length > 0) {
                isAuthenticated = true;
            } else {
                return res.status(401).json({ error: "API-key is ongeldig" });
            }
        } else if (sessionId) {
            const userId = await redisClient.get(`session:${sessionId}`)
            if (userId) {
                isAuthenticated = true
            }
        }

        if (!isAuthenticated) {
            return res.status(401).json({ error: "Niet geautoriseerd." });
        }
            
    } catch (error) {
        console.error("[AUTHENTICATION ERROR]", error);
        return res.status(500).json({ error: "Interne serverfout." })
    }
    

    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    const produce = req.query.produce;

    const cacheKey = `${latitude}_${longitude}_${produce}`;

    const cachedData = await redisClient.get(cacheKey);

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
        
        await redisClient.setEx(cacheKey, ttl, JSON.stringify(calculateData(data, produce)));
        console.log(`[API FETCH] Data voor ${cacheKey} opgehaald van API`);

        res.json(calculateData(data, produce));
    }
    catch (error) {
        console.error("Dat ging niet helemaal lekker", error);
        res.status(500).json({ error: "Helaas konden wij de api data niet ophalen (volgende keer beter!)" });
    }

});

app.post("/api/v1/register", async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "Vul alle velden in."});
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertQuery = `
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email
        `;

        const result = await pool.query(insertQuery, [username, email, hashedPassword])
        const newUser = result.rows[0];
        const sessionId = "sess_" + crypto.randomBytes(32).toString('hex');

        await redisClient.setEx(`session:${sessionId}`, sessionTtl, newUser.id.toString());

        console.log(`[USER REGISTERED] Nieuwe gebruiker: ${username}, sessionID: ${sessionId}`)
        res.status(201).json({ success: true, sessionID: sessionId, user: result.rows[0] });
    } catch (error) {
        console.error("[DATABASE ERROR]", error);
        if (error.code === "23505") {
            return res.status(409).json({ error: "Gebruikersnaam of e-mail bestaat al"})
        }
        res.status(500).json({ error: "Interne serverfout."});
    }
})

app.post("/api/v1/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ error: "Vul e-mailadres èn wachtwoord in." });
    }

    try {
        const loginQuery = `SELECT id, username, password_hash FROM users WHERE email = $1`;
        const result = await pool.query(loginQuery, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Inloggegevens zijn ongeldig." });
        }

        const user = result.rows[0];

        const wachtwoordKlopt = await bcrypt.compare(password, user.password_hash);

        if (!wachtwoordKlopt) {
            return res.status(401).json({ error: "Inloggegevens zijn ongeldig." });
        }

        const sessionId = "sess_" + crypto.randomBytes(32).toString('hex');

        await redisClient.setEx(`session:${sessionId}`, sessionTtl, user.id.toString());

        console.log(`[LOGIN] Gebruiker ${user.username} ingelogd, sessionID: ${sessionId}`);

        res.json({ success: true, sessionID: sessionId, user: { id: user.id, username: user.username } });
    } catch (error) {
        console.log("[LOGIN ERROR]", error);
        res.status(500).json({ error: "Interne serverfout." });
    }
})

app.post("/api/v1/generate-api-key", async (req, res) => {
    const sessionId = req.cookies.sessionID;

    if (!sessionId) {
        return res.status(401).json({ error: "Niet ingelogd." })
    }

    try {
        const userId = await redisClient.get(`session:${sessionId}`);

        if (!userId) {
            return res.status(401).json({ error: "Sessie is ongeldig" })
        }

        const apiKey = "tm_key_" + crypto.randomBytes(32).toString('hex');

        const updateQuery = `
            UPDATE users
            SET api_key = $1
            WHERE id = $2
            RETURNING api_key
        `;

        const result = await pool.query(updateQuery, [apiKey, userId]);

        console.log(`[API KEY] nieuwe api key gecreeërd voor userid: ${userId}`)

        res.status(201).json({ success: true, api_key: result.rows[0].api_key })
    } catch (error) {
        console.error("[API KEY ERROR]", error);

        if (error.code === '23505') {
            return res.status(500).json({ error: "Sleutel bestaat al, probeer opnieuw" });
        }

        res.status(500).json({ error: "Interne serverfout"});
    }
})

app.listen(portNr, () => {
    console.log(`== Server online ==\nURL: http://127.0.0.1${portNr == 80 ? '' : `:${portNr}`}\nIP: 127.0.0.1/\nPort: ${portNr}\nAPI: http://127.0.0.1${portNr == 80 ? '' : `:${portNr}`}/api/v1/data`)
})