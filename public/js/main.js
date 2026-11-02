const mainBody = document.getElementById("mainBody");
const plantButton = document.getElementById("inputButton");
const dateInput = document.getElementById("dateInput");
const formData = document.getElementById("dataForm");
const produceButton = document.getElementById("produceButton");
const produceOptions = document.querySelectorAll(".produceOptions button");

let plantenChart = null;
let hourlyChart = null;
let selectedProduce = "summerWheat";

const produceSettings = {
    summerWheat: {
        maxWind: 10,
        maxWindGusts: 30,
        minTemp: 5,
        maxTemp: 15, 
        maxMm: 2,
        maxProbability: 20,
        minMoisture1_3cm: 0.18,
        maxMoisture1_3cm: 0.28,
        
        minMoisture3_9cm: 0.200,
        maxMoisture3_9cm: 0.300,
        
        minMoisture9_27cm: 0.220,
        maxMoisture9_27cm: 0.320,
        
        minSoilTemp: 5,
        maxSoilTemp: 15
    },
    silageCorn: {
        maxWind: 20,
        maxWindGusts: 35,
        minTemp: 8,
        maxTemp: 30, 
        maxMm: 2,
        maxProbability: 40,
        minMoisture1_3cm: 0.18,
        maxMoisture1_3cm: 0.30,
        
        minMoisture3_9cm: 0.20,
        maxMoisture3_9cm: 0.32,
    
        minMoisture9_27cm: 0.20,
        maxMoisture9_27cm: 0.32,
        
        minSoilTemp: 10,
        maxSoilTemp: 30
    }   
};

formData.addEventListener("submit", async function (event) {
    event.preventDefault();

    const urlData = new FormData(this);
    const searchParams = new URLSearchParams(urlData);
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        })

        const latitude = Math.round(position.coords.latitude * 100) / 100;
        const longitude = Math.round(position.coords.longitude * 100) / 100;

        searchParams.delete("date");
        searchParams.append("latitude", latitude);
        searchParams.append("longitude", longitude);

        const queryString = searchParams.toString();

        checkPlanting(queryString);
    }
    catch (error) {
        console.error("Kon de live locatie niet ophalen.");
        alert("Live locatie kon niet opgevraagd worden, geef je browser toestemming");
        
    }
})

produceOptions.forEach((button) => {
    button.addEventListener("click", () => {
        selectedProduce = button.dataset.produce;
    
    produceButton.textContent =  button.textContent.trim();
    console.log(selectedProduce);
    });
});

async function fetchData(paramString) {
    try {
        const response = await fetch(`/api/v1/data?${paramString}`);
        if (!response.ok) {
            throw new Error('failed to fetch data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
    return {};
}

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
        return { score: 0.5, warning: `Soil moisture (1-3cm) is slightly outside optimal range` };
    } else {
        return { score: 0.0, warning: `Soil moisture (1-3cm) is unsuitable for planting` };
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
    const aantalZeroesInList = scorenList.filter(s => s === 0.0).length; //tel aantal 0.0's in die uur. Zodat het niet meer op 3 of 4 kan komen met nulletjes

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
//returnt een array van scructured obj
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
        warnings: allWarningsForDay
    };
}

function getStarRating(score) {
    return "⭐".repeat(score || 1);
}

async function checkPlanting(paramString) {
    const settings = produceSettings[selectedProduce] || produceSettings.summerWheat;
    const data = await fetchData(paramString);

    const chosenDate = dateInput.value;
    const weekdatums = getAWeekAfterDate(chosenDate);

    const weekResults = weekdatums.map(datum => checkPlantingConditions(data, datum, settings));
    const dailyScores = weekResults.map(res => res.dailyScore);

    
    createChart(weekdatums, dailyScores, data, settings);
    
    const firstDay = weekResults[0];
    //Hoeft misschien niet, maar wijs uurgrafiek van gekozen datum direct
    createHourlyChart(firstDay.labels, firstDay.hourlyScores, chosenDate);
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

function createChart(datums, scores, data, settings) {
    const ctx = document.getElementById('myChart');
    const barChartLegenda = document.querySelector('.chartLegenda');

    if (barChartLegenda) barChartLegenda.style.display = 'block';
    if (plantenChart) plantenChart.destroy();

    const barColors = scores.map(score => {
        if (score === 4) return '#2e7d32'; 
        if (score === 3) return '#558b2f'; 
        if (score === 2) return '#ef6c00';
        return '#c62828';                   
    });

    plantenChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datums,
            datasets: [{
                label: `Planting advice (${datums[0]}): ${getStarRating(scores[0])}`,
                data: scores, 
                backgroundColor: barColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        
                        label: function(context) {
                            const score = context.raw;
                            const stars = getStarRating(score);
                            const statusText = {
                                4: "Perfect",
                                3: "Good",
                                2: "Fair",
                                1: "Poor"
                            };
                            return ` Score: ${score}/4 (${stars}) - ${statusText[score] || ''}`;
                        }
                    }
                }
            },
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const clickedIndex = activeElements[0].index;
                    const clickedDate = datums[clickedIndex];
                    const clickedScore = scores[clickedIndex];

                    plantenChart.data.datasets[0].label = `Planting advice (${clickedDate}): ${getStarRating(clickedScore)}`;
                    plantenChart.update();

                    const clickedDayResult = checkPlantingConditions(data, clickedDate, settings);
                    createHourlyChart(clickedDayResult.labels, clickedDayResult.hourlyScores, clickedDate);
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 4,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

//uurchart functie.
//Labels: de array met de tijdstippen vd dag zoals 01:00 etc
//array met berekende score 1-4 p/uur
function createHourlyChart(labels, hourlyScores, datum) {
    const ctx = document.getElementById('hourlyChart');
    const wrapper = document.querySelector('.hourlyChartWrapper');
    const title = document.getElementById('hourlyChartTitle');

    if (!ctx) return;

    if (wrapper){
        wrapper.style.display = 'block';
    } 

    if (title) {
        const dateObj = new Date(datum);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', month: 'long', day: 'numeric' 
        });
        title.textContent = `24-Hour graph (${formattedDate})`;
    }

    if (hourlyChart) {
        hourlyChart.destroy();
    }

    const pointColors = hourlyScores.map(score => {
        if (score === 4) return '#2e7d32'; 
        if (score === 3) return '#558b2f'; 
        if (score === 2) return '#ef6c00'; 
        return '#c62828';                   
    });

    hourlyChart = new Chart(ctx, {
        type: 'line', //lijngrafiek
        data: {
            labels: labels, 
            datasets: [{
                label: 'Hourly Planting Advice',
                data: hourlyScores,
                borderColor: '#2e7d32',
                backgroundColor: 'rgba(46, 125, 50, 0.15)',
                borderWidth: 2,
                fill: true,
                tension: 0.2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: pointColors,
                pointBorderColor: pointColors
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const score = context.raw;
                            const stars = "⭐".repeat(score);
                            const statusText = {
                                4: "Perfect",
                                3: "Good",
                                2: "Fair",
                                1: "Poor"
                            };
                            return ` Score: ${score}/4 (${stars}) - ${statusText[score] || ''}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            const labels = { 1: '1 (Poor)', 2: '2 (Fair)', 3: '3 (Good)', 4: '4 (Perfect)'};
                            if(value === 5) return ''; //verberg y-as 5. want max cijfer is toch tot 4
                            return labels[value] || value;
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hours of the day'
                    }
                }
            }
        }
    });
}