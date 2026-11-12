const produceSettings = require("./produceSettings");

/**
 * Bouwt de definition table op met de ideale drempelwaarden van het gekozen gewas.
 *
 * @param {Object} settings - De instellingen van het gewas.
 * @returns {Object} Tabel met warning-codes en bijbehorende teksttemplates.
 */
function lookupWarningTable(settings) {
    const WARNING_DEFINITIONS = {
        1:  "Snow detected on the ground",
        10: `Wind is too strong for planting ({val} km/h, max ideal: ${settings.maxWind} km/h)`,
        11: `Wind speed is slightly high ({val} km/h, max ideal: ${settings.maxWind} km/h)`,
        20: "Freezing temperature detected ({val}°C)",
        21: `Unfavorable temperature: {val}°C (ideal: ${settings.minTemp}-${settings.maxTemp}°C)`,
        22: `Not the best temperature ({val}°C), but planting is still possible (ideal: ${settings.minTemp}-${settings.maxTemp}°C)`,
        30: `Soil too wet or high precipitation risk ({val} mm, {prob}%, max ideal: ${settings.maxMm} mm / ${settings.maxProbability}%)`,
        31: `Risk of light rainfall expected ({val} mm, max ideal: ${settings.maxMm} mm)`,
        40: `Soil moisture (1-3cm) is unsuitable for planting: {val} m³/m³ (ideal: ${settings.minMoisture1_3cm}-${settings.maxMoisture1_3cm} m³/m³)`,
        41: `Soil moisture (1-3cm) is slightly outside optimal range: {val} m³/m³ (ideal: ${settings.minMoisture1_3cm}-${settings.maxMoisture1_3cm} m³/m³)`,
        50: `Soil temperature is not suitable for planting: {val}°C (ideal: ${settings.minSoilTemp}-${settings.maxSoilTemp}°C)`,
        51: `Soil temperature ({val}°C) is not ideal, but planting is possible (ideal: ${settings.minSoilTemp}-${settings.maxSoilTemp}°C)`
    };

    return WARNING_DEFINITIONS;
}

function checkWind(wind, windGusts, settings) {
    const maxWind = settings.maxWind;
    const maxWindGusts = settings.maxWindGusts;

    if (wind <= maxWind && windGusts <= maxWindGusts) {
        return { score: 1.0, warning: null };
    } else if ((wind > maxWind && wind < (maxWind + 2)) && windGusts <= maxWindGusts + 4) {
        return { score: 0.5, warning: { code: 11, val: wind } };
    } else {
        return { score: 0.0, warning: { code: 10, val: wind } };
    }
}

function checkTemp(temp, settings) {
    const maxTemp = settings.maxTemp;
    const minTemp = settings.minTemp;

    if (temp <= 0) {
        return { score: 0.0, warning: { code: 20, val: temp } };
    }

    if (temp >= minTemp && temp <= maxTemp) {
        return { score: 1.0, warning: null };
    } else if ((temp > maxTemp && temp < maxTemp + 2) || (temp < minTemp && temp > minTemp - 2)) {
        return { score: 0.5, warning: { code: 22, val: temp } };
    } else {
        return { score: 0.0, warning: { code: 21, val: temp } };
    }
}

function checkMm(mm, prob, settings) {
    const maxMm = settings.maxMm;
    const maxProbability = settings.maxProbability;

    if (mm <= maxMm && prob <= maxProbability) {
        return { score: 1.0, warning: null };
    } else if (mm > maxMm && mm < maxMm + 1.5 && prob <= maxProbability + 15) {
        return { score: 0.5, warning: { code: 31, val: mm } };
    } else {
        return { score: 0.0, warning: { code: 30, val: mm, prob: prob } };
    }
}

function checkSoilMoisture(soilMoist, settings) {
    const minMoisture1_3cm = settings.minMoisture1_3cm;
    const maxMoisture1_3cm = settings.maxMoisture1_3cm;

    if (soilMoist >= minMoisture1_3cm && soilMoist <= maxMoisture1_3cm) {
        return { score: 1.0, warning: null };
    } else if ((soilMoist > maxMoisture1_3cm && soilMoist < maxMoisture1_3cm + 0.03) || 
               (soilMoist < minMoisture1_3cm && soilMoist > minMoisture1_3cm - 0.02)) {
        return { score: 0.5, warning: { code: 41, val: soilMoist } };
    } else {
        return { score: 0.0, warning: { code: 40, val: soilMoist } };
    }
}

function checkSoilTemp(soilTemp, settings) {
    const minSoilTemp = settings.minSoilTemp;
    const maxSoilTemp = settings.maxSoilTemp;

    if (soilTemp >= minSoilTemp && soilTemp <= maxSoilTemp) { 
        return { score: 1.0, warning: null };
    } else if ((soilTemp > maxSoilTemp && soilTemp < maxSoilTemp + 2) || 
               (soilTemp < minSoilTemp && soilTemp > minSoilTemp - 1.5)) {
        return { score: 0.5, warning: { code: 51, val: soilTemp } };
    } else {
        return { score: 0.0, warning: { code: 50, val: soilTemp } };
    }
}

function evaluateHour(uur, settings) {
    if (uur.snow > 0) {
        return { scoreTot: 1, warnings: [{ code: 1 }] };
    }

    const windScore = checkWind(uur.wind, uur.gusts, settings);
    const tempScore = checkTemp(uur.temp, settings);
    const rainScore = checkMm(uur.mm, uur.prob, settings);
    const moistScore = checkSoilMoisture(uur.moisture, settings);
    const soilTempScore = checkSoilTemp(uur.soilTemp, settings);

    const scorenList = [windScore.score, tempScore.score, rainScore.score, moistScore.score, soilTempScore.score]; //hief maak ik array met de scores v alle categorien voor filteren
    const aantalZeroesInList = scorenList.filter(s => s === 0.0).length; //tel aantal 0.0's in die uur

    const totaal = windScore.score + tempScore.score + rainScore.score + moistScore.score + soilTempScore.score;
    const percentage = (totaal / 5.0) * 100;

    let scoreTot = 1;
    if (percentage >= 85) {
        scoreTot = 4;
    } else if (percentage >= 60) {
        scoreTot = 3;
    } else if (percentage >= 40) {
        scoreTot = 2;
    }
     //Dit gezet zodat wanneer er 0en voorkomen, de score nooit meer dan 2 wordt. Dus MAX 2 if there exists a 0.
    if (aantalZeroesInList >= 2){
        scoreTot = 1;
    }
    else if(aantalZeroesInList === 1 && scoreTot > 2){
        scoreTot = 2;
    }

    const hourWarnings = [
        windScore.warning, 
        tempScore.warning, 
        rainScore.warning, 
        moistScore.warning, 
        soilTempScore.warning
    ].filter(Boolean);

    return { scoreTot, warnings: hourWarnings };
}

/**
 * Filtert raw API-data en isoleert alle uren die bij een specifieke datum horen
 * @param {Object} data - De complete API-respons met "data.hourly" 
 * @param {*} datum - Datumtekst in format "YYYY-MM-DD"
 * @returns {Array<Object>} Array van uurobjecten met formatted waarden en "HH:MM" timeLabels
 */
function getUren(data, datum) {
    const uren = [];
    if (!data.hourly || !data.hourly.time) return uren;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(datum)) {
            const timeLabel = time.split('T')[1].substring(0, 5);

            uren.push({
                index: index,
                timeLabel: timeLabel,
                temp: data.hourly.temperature_2m[index],
                wind: data.hourly.wind_speed_10m[index],
                gusts: data.hourly.wind_gusts_10m[index],
                mm: data.hourly.precipitation[index],
                prob: data.hourly.precipitation_probability[index],
                moisture: data.hourly.soil_moisture_1_to_3cm[index],
                soilTemp: data.hourly.soil_temperature_6cm[index],
                snow: data.hourly.snow_depth ? data.hourly.snow_depth[index] : 0
            });
        }
    });
    return uren;
}

/**
 * Berekent de volledige dagbeoordeling voor een specifieke datum obv de 24 uurlijkse metingen.
 *
 * @param {Object} data - De complete API-respons met uurlijkse weerdata.
 * @param {string} datum - Datumtekst in formaat 'YYYY-MM-DD'.
 * @param {Object} settings - Gewasspecifieke instellingen.
 * @returns {{labels: string[], hourlyScores: number[], dailyScore: number, warnings: string[], evaluations: Array}} Dagresultaat-object voor de frontend.
 */
function checkPlantingConditions(data, datum, settings) {
    const uren = getUren(data, datum);

    if (uren.length === 0) {
        return { labels: [], hourlyScores: [], dailyScore: 1, warnings: [] , evaluations: []};
    }

    const evaluations = uren.map(uur => evaluateHour(uur, settings));
    const labels = uren.map(uur => uur.timeLabel);
    const hourlyScores = evaluations.map(e => e.scoreTot);

    const allWarningsForDay = [];
    evaluations.forEach(e => {
        if (e.warnings) {
            e.warnings.forEach(w => {
                const exists = allWarningsForDay.some(item => item.code === w.code && item.val === w.val);
                if (!exists) {
                    allWarningsForDay.push(w);
                }
            });
        }
    });

    const sum = hourlyScores.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / hourlyScores.length;

    let dailyScore = 1;
    if (avg >= 3.5) dailyScore = 4;
    else if (avg >= 2.7) dailyScore = 3;
    else if (avg >= 1.8) dailyScore = 2;

    return {
        labels: labels, 
        hourlyScores: hourlyScores,
        dailyScore: dailyScore,    
        warnings: allWarningsForDay,
        evaluations: evaluations
    };
}


/**
 * Genereert een array van 7 datum strings na vandaag.
 *
 * @param {string} dateString - StartdatumString'.
 * @returns {string[]} Array van 7 ISO datum-strings ['YYYY-MM-DD', ...].
 */
function getAWeekAfterDate(dateString) {
    const datums = [];
    const startDate = new Date(dateString);
    for (let i = 0; i < 7; i++) {
        const pickedDate = new Date(startDate);
        pickedDate.setDate(startDate.getDate() + i);
        datums.push(pickedDate.toISOString().split('T')[0]);
    }
    return datums; 
}

function generateData(data, produce) {
    const settings = produceSettings[produce];

    const today = data.hourly.time[0].split("T")[0];
    const weekdatums = getAWeekAfterDate(today);

    const weekResults = weekdatums.map(datum => checkPlantingConditions(data, datum, settings));

    return {
        warningDefinitions: lookupWarningTable(settings),
        forecast: weekResults
    };
}

module.exports = generateData;