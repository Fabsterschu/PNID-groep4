const mainBody = document.getElementById("mainBody");
const plantButton = document.getElementById("inputButton");
const dateInput = document.getElementById("dateInput");
const formData = document.getElementById("dataForm");
const scoreboard = document.getElementById("scoreboard");
const scoreNr = document.getElementById("scoreNr");
const produceButton = document.getElementById("produceButton");
const produceOptions = document.querySelectorAll(".produceOptions button");

let plantenChart = null;
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

function getPosition() {

}

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

function tooMuchWind(data, settings, datum) {
    const chosenDate = datum;
    const maxWind = settings.maxWind;
    const maxWindGusts = settings.maxWindGusts;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const wind = data.hourly.wind_speed_10m[index];
            const windGusts = data.hourly.wind_gusts_10m[index];
            
            if (wind >= maxWind || windGusts >= maxWindGusts) { 
                // diplay alleen wind in km/h niet gusts.
                display(`Too Windy: ${wind}${data.hourly_units.wind_speed_10m}`, 'wind')
            }
             
        }
    });
}

function tooSnowy(data,datum) {
    const chosenDate = datum;
    
    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const snow = data.hourly.snow_depth[index];
            if (snow > 0) {
                display(`It's snowing: ${snow}${data.hourly_units.snow_depth}`, 'snow')
            }
        }
    });
}

//Hoofdfunctie voor het berekene scores voor planten
function calculatePlantingScore(data, datum, settings) {
    let totalScore = 0.0;
    let snowy = false;
    const maxWind = settings.maxWind;
    const maxWindGusts = settings.maxWindGusts;
    const maxTemp = settings.maxTemp;
    const minTemp = settings.minTemp;
    const maxMm = settings.maxMm;
    const maxProbability = settings.maxProbability;
    const minMoisture1_3cm = settings.minMoisture1_3cm;
    const maxMoisture1_3cm = settings.maxMoisture1_3cm;

    const minMoisture3_9cm = settings.minMoisture3_9cm;
    const maxMoisture3_9cm = settings.maxMoisture3_9cm;

    const minMoisture9_27cm = settings.minMoisture9_27cm;
    const maxMoisture9_27cm = settings.maxMoisture9_27cm;
     const minSoilTemp = settings.minSoilTemp;
    const maxSoilTemp = settings.maxSoilTemp;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(datum)) {
            
            if (data.hourly.snow_depth[index] > 0) {
                snowy = true;
            }

            const wind = data.hourly.wind_speed_10m[index];
            const windGusts = data.hourly.wind_gusts_10m[index];
            if (wind <= maxWind && windGusts <= maxWindGusts) {
                totalScore += 1.0;
            }
            else if ((wind > maxWind && wind < (maxWind+3)) && windGusts <= maxWindGusts) {
                totalScore += 0.5;
            }
            else if ((wind > maxWind && wind < (maxWind+3)) && ((windGusts > maxWindGusts) && (windGusts < (maxWindGusts+6)))){
                totalScore += 0.15;
            } 
            else if ((wind <= maxWind ) && (windGusts > maxWindGusts && windGusts < maxWindGusts+6)) {
                totalScore += 0.5;
            }
            const temp = data.hourly.temperature_2m[index];
            if (temp >= minTemp && temp <= maxTemp) {
                totalScore += 1.0;
            }
            else if ((temp > maxTemp && temp < maxTemp+3) || (temp < minTemp  && temp > minTemp-3)){
                totalScore += 0.5;
            } 

        
            const mm = data.hourly.precipitation[index];
            const prob = data.hourly.precipitation_probability[index];
            if (mm <= maxMm && prob <= maxProbability) {
                totalScore += 1.0;
            }
            else if (mm > maxMm && mm < maxMm+3 && prob <= maxProbability) {
                totalScore += 0.5;
            }
            else if (mm <= maxMm && prob > maxProbability && prob < maxProbability+10) {
                totalScore += 0.5;
            }

            const soilMoist = data.hourly.soil_moisture_1_to_3cm[index];
            if (soilMoist >= minMoisture1_3cm && soilMoist <= maxMoisture1_3cm) {
                totalScore += 1.0;
            }
            else if ((soilMoist > maxMoisture1_3cm && soilMoist < maxMoisture1_3cm+0.05) || (soilMoist < minMoisture1_3cm && soilMoist > minMoisture1_3cm-0.03)) {
                totalScore += 0.5;
            } 

            
            const soilTemp = data.hourly.soil_temperature_6cm[index];
            if (soilTemp >= minSoilTemp && soilTemp <= maxSoilTemp) { 
                totalScore += 1.0;
            }
            else if ((soilTemp > maxSoilTemp && soilTemp < maxSoilTemp+3) || (soilTemp < minSoilTemp && soilTemp > minSoilTemp-2)) {
                totalScore += 0.5;
            }
        }
    });

    if (snowy) {
        return 1;
    }
    //24uren in een dag en 5 categorieen, dus 24 * 5 = 120 maxscore
    const percentage = (totalScore / 120) * 100;
    if (percentage >= 100) {
        return 4;
    }
    if (percentage >= 85) {
        return 3;
    }
    if (percentage >= 60) {
        return 2;
    }
    else {
    return 1;
    }
}



function rightTemperature(data, settings, datum) {
    const maxTemp = settings.maxTemp;
    const minTemp = settings.minTemp;
    const chosenDate = datum;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const temp = data.hourly.temperature_2m[index];
            if (temp > maxTemp || temp < minTemp) {
                display(`Not the right temperature: ${temp}${data.hourly_units.temperature_2m}`, 'temp')
            }
        }
    });

}

function checkPrecipitation(data, settings, datum) {
    // 0 tot max 2 mm per dag en minder dan 20% precipitation voor het planten zelf (en 2-3 dagen ervoor)
    // 15 tot 25 mm opgeteld over 7 - 14 dagen en 50% precipitation voor de 1-2 weken erna
    // voor het PoC ga ik nu uit van alleen planten
    const maxMm = settings.maxMm;
    const maxProbability = settings.maxProbability;
    const chosenDate = datum;
    const hourlyData = data.hourly;
    const hourlyUnits = data.hourly_units;

    hourlyData.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const mm = hourlyData.precipitation[index];
            const probability = hourlyData.precipitation_probability[index];

            if (mm > maxMm || probability > maxProbability) {
                display(`Too wet: ${mm}${hourlyUnits.precipitation}, ${probability}${hourlyUnits.precipitation_probability}`)
            }


        }
    })
}


function checkSoilMoisture(data, settings, datum) {
    const minMoisture1_3cm = settings.minMoisture1_3cm;
    const maxMoisture1_3cm = settings.maxMoisture1_3cm;

    const minMoisture3_9cm = settings.minMoisture3_9cm;
    const maxMoisture3_9cm = settings.maxMoisture3_9cm;

    const minMoisture9_27cm = settings.minMoisture9_27cm;
    const maxMoisture9_27cm = settings.maxMoisture9_27cm;
    const chosenDate = datum;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const moisture1_3cm = data.hourly.soil_moisture_1_to_3cm[index];
            const moisture3_9cm = data.hourly.soil_moisture_3_to_9cm[index];
            const moisture9_27cm = data.hourly.soil_moisture_9_to_27cm[index];

            if (moisture1_3cm < minMoisture1_3cm || moisture1_3cm > maxMoisture1_3cm) {
                display(`Soil moisture 1-3cm not right for planting: ${moisture1_3cm}${data.hourly_units.soil_moisture_1_to_3cm}`, 'moisture1_3cm');
            }
            if (moisture3_9cm < minMoisture3_9cm || moisture3_9cm > maxMoisture3_9cm) {
                display(`Soil moisture 3-9cm not right for planting: ${moisture3_9cm}${data.hourly_units.soil_moisture_3_to_9cm}`, 'moisture3_9cm');
            }
            if (moisture9_27cm < minMoisture9_27cm || moisture9_27cm > maxMoisture9_27cm) {
                display(`Soil moisture 9-27cm not right for planting ${moisture9_27cm}${data.hourly_units.soil_moisture_9_to_27cm}`, 'moisture9_27cm');
            }

        }
    });
}

function rightSoilTemperature(data, settings, datum) {
    const minSoilTemp = settings.minSoilTemp;
    const maxSoilTemp = settings.maxSoilTemp;
    const chosenDate = datum;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const soilTemp = data.hourly.soil_temperature_6cm[index];
            if (soilTemp < minSoilTemp || soilTemp > maxSoilTemp) {
                display(`Soil temperature not good: ${soilTemp}${data.hourly_units.soil_temperature_6cm}`, 'soilTemp');
            }
        }
    });
}


function display(tekst, categorie) {
    const newElement = document.createElement(`p`);
    newElement.classList.add('advies');

    if (categorie) {
        newElement.classList.add(categorie);
    }

    newElement.innerText = tekst;
    mainBody.appendChild(newElement);
}


async function checkPlanting(paramString) {
    const settings = produceSettings[selectedProduce];
    const data = await fetchData(paramString);
    console.log(data);
    Array.from(mainBody.children).forEach((child) => {
        if (child.nodeName == "P") {
            child.remove();
        }
    })
    const chosenDate = dateInput.value;
    const weekdatums = getAWeekAfterDate(chosenDate);

    const scores = weekdatums.map(datum => calculatePlantingScore(data, datum, settings));
    
    // tooSnowy(data);
    // tooMuchWind(data);
    // rightTemperature(data);
    // checkPrecipitation(data);
    // checkSoilMoisture(data);
    // rightSoilTemperature(data);
   // const adviceNumber = checkAdvice(data);

    if (scoreNr) {
        scoreNr.textContent = scores[0]; 
    }
    showDetailedAdvice(data,settings,chosenDate);
    createChart(weekdatums, scores, data, settings);

}

//Deze functie geeft een array terug met de 7dagen na gekozen datum, incl gekozen datum
function getAWeekAfterDate(dateString){
   const datums = [];
    const startDate = new Date(dateString);
    for (let i = 0; i < 7; i++) {
        const pickedDate = new Date(startDate);

        pickedDate.setDate(startDate.getDate() + i);
        const formattedDate = pickedDate.toISOString().split('T')[0];
        

        datums.push(formattedDate);
    }
    //console.log(datums);
    return datums; 
}

function showDetailedAdvice(data,settings,datum){
    Array.from(mainBody.children).forEach((child) => {
        if (child.nodeName === "P") {
            child.remove();
        }
    });

    tooSnowy(data, datum);
    tooMuchWind(data, settings, datum);
    rightTemperature(data, settings, datum);
    checkPrecipitation(data, settings, datum);
    checkSoilMoisture(data, settings, datum);
    rightSoilTemperature(data, settings, datum);
}




function createChart(datums,scores, data, settings){
  const ctx = document.getElementById('myChart');
  const barChartLegenda = document.querySelector('.chartLegenda');

  if(barChartLegenda){
    barChartLegenda.style.display = 'block';
  }
  if (plantenChart) {
    plantenChart.destroy();
  }

  const barColors = scores.map(score => {
        if (score == 4) return '#2e7d32'; 
        if (score == 3) return '#558b2f'; 
        if (score == 2) return '#ef6c00';
        return '#c62828';                   
    });

  plantenChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datums,
      datasets: [{
        label: `Planting advice today: ${scores[0]}`,
        data: scores, 
        backgroundColor: barColors,
        borderWidth: 1
      }]
    },
    options: {
        onClick: (event, activeElements) => {
        if (activeElements.length > 0) {
          const clickedIndex = activeElements[0].index;
          const clickedDate = datums[clickedIndex];
          
          
          showDetailedAdvice(data, settings, clickedDate);
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
   
}


