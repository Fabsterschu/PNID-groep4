const produceSettings = require("./produceSettings");

let selectedProduce = "summerWheat";

function checkWind(wind, windGusts, settings) {
    const maxWind = settings.maxWind;
    const maxWindGusts = settings.maxWindGusts;

    if (wind <= maxWind && windGusts <= maxWindGusts) {
        return { score: 1.0, warning: null };
    } else if ((wind > maxWind && wind < (maxWind + 2)) && windGusts <= maxWindGusts+4) {
        return { score: 0.5, warning: `Wind speed is slightly high (${wind} km/h)` };
    // } else if ((wind > maxWind && wind < (maxWind + 3)) && ((windGusts > maxWindGusts) && (windGusts < (maxWindGusts + 6)))) {
    //     return { score: 0.15, warning: `Wind speed and gusts are high` };
    // } else if ((wind <= maxWind) && (windGusts > maxWindGusts && windGusts < maxWindGusts + 6)) {
    //     return { score: 0.5, warning: `Wind gusts are slightly high` };
    } else {
        return { score: 0.0, warning: `Wind is too strong for planting (${wind} km/h)` };
    }
}

function checkTemp(temp, settings) {
    const maxTemp = settings.maxTemp;
    const minTemp = settings.minTemp;

    if(temp <= 0){
        return {score: 0.0, warning: `Freezing temperature detected`};
    }

    if (temp >= minTemp && temp <= maxTemp) {
        return { score: 1.0, warning: null };
    } else if ((temp > maxTemp && temp < maxTemp + 2) || (temp < minTemp && temp > minTemp - 2)) {
        return { score: 0.5, warning: `Not the best temperature (${temp}°C), but planting is still possible` };
    } else {
        return { score: 0.0, warning: `Unfavorable temperature: ${temp}°C (ideal: ${minTemp}-${maxTemp}°C)` };
    }
}

function checkMm(mm, prob, settings) {
    const maxMm = settings.maxMm;
    const maxProbability = settings.maxProbability;

    if (mm <= maxMm && prob <= maxProbability) {
        return { score: 1.0, warning: null };
    } 
    else if (mm > maxMm && mm < maxMm + 1.5 && prob <= maxProbability + 15) {
        return { score: 0.5, warning: `Risk of light rainfall expected (${mm} mm)` };
    } 
    // else if (mm <= maxMm && prob > maxProbability && prob < maxProbability + 10) {
    //     return { score: 0.5, warning: `Moderate precipitation probability (${prob}%)` };
    // } 
    else {
        return { score: 0.0, warning: `Soil too wet or high precipitation risl (${mm} mm, ${prob}%)` };
    }
}

function checkSoilMoisture(soilMoist, settings) {
    const minMoisture1_3cm = settings.minMoisture1_3cm;
    const maxMoisture1_3cm = settings.maxMoisture1_3cm;

    if (soilMoist >= minMoisture1_3cm && soilMoist <= maxMoisture1_3cm) {
        return { score: 1.0, warning: null };
    } else if ((soilMoist > maxMoisture1_3cm && soilMoist < maxMoisture1_3cm + 0.03) || 
               (soilMoist < minMoisture1_3cm && soilMoist > minMoisture1_3cm - 0.02)) {
        return { score: 0.5, warning: `Soil moisture (1-3cm) is slightly outside optimal range: ${soilMoist} m³/m³, ideal range: ${minMoisture1_3cm} - ${maxMoisture1_3cm} m³/m³ ` };
    } else {
        return { score: 0.0, warning: `Soil moisture (1-3cm) is unsuitable for planting: ${soilMoist}, ideal range: ${minMoisture1_3cm} - ${maxMoisture1_3cm} m³/m³ ` };
    }
}

function checkSoilTemp(soilTemp, settings) {
    const minSoilTemp = settings.minSoilTemp;
    const maxSoilTemp = settings.maxSoilTemp;

    if (soilTemp >= minSoilTemp && soilTemp <= maxSoilTemp) { 
        return { score: 1.0, warning: null };
    } else if ((soilTemp > maxSoilTemp && soilTemp < maxSoilTemp + 2) || 
               (soilTemp < minSoilTemp && soilTemp > minSoilTemp - 1.5)) {
        return { score: 0.5, warning: `Soil temperature (${soilTemp}°C) is not ideal, but planting is possible` };
    } else {
        return { score: 0.0, warning: `Soil temperature is not suitable for planting: ${soilTemp}°C` };
    }
}

function evaluateHour(uur, settings) {
    if (uur.snow > 0) {
        return { scoreTot: 1, warnings: [`Snow detected on the ground`] };
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
//returnt een array van scructured obj met de eigenschappen: (labels, hourlyScores, dailyScore, warnings en evaluations) 
//labels = de timestamps van de dag zoals 02:00
function checkPlantingConditions(data, datum, settings) {
    const uren = getUren(data, datum);

    if (uren.length === 0) {
        return { labels: [], hourlyScores: [], dailyScore: 1, warnings: [] };
    }

    const evaluations = uren.map(uur => evaluateHour(uur, settings));
    const labels = uren.map(uur => uur.timeLabel);
    const hourlyScores = evaluations.map(e => e.scoreTot);

    const allWarningsForDay = [];
    evaluations.forEach(e => {
        if (e.warnings) {
            e.warnings.forEach(w => {
                if (!allWarningsForDay.includes(w)) {
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

function getStarRating(score) {
    return "⭐".repeat(score || 1);
}

//Returnt een array
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

    const date_time = new Date();
    const today = date_time.toJSON().split("T")[0];
    const weekdatums = getAWeekAfterDate(today);

    const weekResults = weekdatums.map(datum => checkPlantingConditions(data, datum, settings));
    const dailyScores = weekResults.map(res => res.dailyScore);

    return weekResults;
}

module.exports = generateData;