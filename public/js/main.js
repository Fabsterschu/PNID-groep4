const mainBody = document.getElementById("mainBody");
const plantButton = document.getElementById("inputButton");
const dateInput = document.getElementById("dateInput");
const formData = document.getElementById("dataForm");
const scoreboard = document.getElementById("scoreboard");
const scoreNr = document.getElementById("scoreNr");

let plantenChart = null;

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

function tooMuchWind(data) {
    const chosenDate = dateInput.value;
    const maxWind = 10;
    const maxWindGusts = 30;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const wind = data.hourly.wind_speed_10m[index];
            const windGusts = data.hourly.wind_gusts_10m[index];
            if(wind <= maxWind && windGusts <= maxWindGusts){
                totalScorePlanting += 1.0;
            }
            if ((wind > maxWind && wind < 13) && (windGusts <= maxWindGusts)) {
                totalScorePlanting += 0.5;
            }
            //beide hebben kleine afwijking, maar opzich niet zo erg
            if((wind > maxWind && wind < 13) && (windGusts > maxWindGusts && windGusts < 40)){
                totalScorePlanting += 0.15;
            }
            if((wind <= maxWind && (windGusts > maxWindGusts && windGusts < 40))){
                totalScorePlanting += 0.5;
            }
            /*
            if (wind >= maxWind || windGusts >= maxWindGusts) { 
                // diplay alleen wind in km/h niet gusts.
                display(`Hella Windy: ${wind}${data.hourly_units.wind_speed_10m}`, 'wind')
            }
             */
        }
    });
}

function tooSnowy(data) {
    const chosenDate = dateInput.value;
    
    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const snow = data.hourly.snow_depth[index];
            if (snow > 0) {
                //display(`It's snowing: ${snow}${data.hourly_units.snow_depth}`, 'snow')
                snowy = true;
            }
        }
    });
}


function calculatePlantingScore(data, datum) {
    let totalScore = 0.0;
    let snowy = false;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(datum)) {
            
            if (data.hourly.snow_depth[index] > 0) {
                snowy = true;
            }

            const wind = data.hourly.wind_speed_10m[index];
            const windGusts = data.hourly.wind_gusts_10m[index];
            if (wind <= 10 && windGusts <= 30) totalScore += 1.0;
            else if (wind > 10 && wind < 13 && windGusts <= 30) totalScore += 0.5;
            else if (wind > 10 && wind < 13 && windGusts > 30 && windGusts < 40) totalScore += 0.15;
            else if (wind <= 10 && windGusts > 30 && windGusts < 40) totalScore += 0.5;

            const temp = data.hourly.temperature_2m[index];
            if (temp >= 5 && temp <= 15) {
                totalScore += 1.0;
            }
            else if ((temp > 15 && temp < 20) || (temp < 5 && temp > 2)){
                totalScore += 0.5;
            } 

        
            const mm = data.hourly.precipitation[index];
            const prob = data.hourly.precipitation_probability[index];
            if (mm <= 2 && prob <= 20) {
                totalScore += 1.0;
            }
            else if (mm > 2 && mm < 5 && prob <= 20) {
                totalScore += 0.5;
            }
            else if (mm <= 2 && prob > 20 && prob < 40) {
                totalScore += 0.5;
            }

            const m1 = data.hourly.soil_moisture_1_to_3cm[index];
            if (m1 >= 0.18 && m1 <= 0.28) {
                totalScore += 1.0;
            }
            else if ((m1 > 0.28 && m1 < 0.35) || (m1 < 0.18 && m1 > 0.10)){
                totalScore += 0.5;
            } 

            
            const soilTemp = data.hourly.soil_temperature_6cm[index];
            if (soilTemp >= 5 && soilTemp <= 15) { 
                totalScore += 1.0;
            }
            else if ((soilTemp > 15 && soilTemp < 20) || (soilTemp < 5 && soilTemp > 2)) {
                totalScore += 0.5;
            }
        }
    });

    if (snowy) {
        return 1;
    }
    //24uren in een dag en 5 categorieen - snowy = 4cat, dus 24*4 = 96 maxscore
    const percentage = (totalScore / 96) * 100;
    if (percentage >= 90) {
        return 4;
    }
    if (percentage >= 60) {
        return 3;
    }
    if (percentage >= 40) {
        return 2;
    }
    else {
    return 1;
    }
}

/*
function checkAdvice(data){
    if(snowy){
        return 1;
    }
    else{
        hoeveelheidPercentage = (totalScorePlanting / 96) * 100;
        if(hoeveelheidPercentage >= 85){
            return 4;
        }
        else if(hoeveelheidPercentage >= 60){
            return 3;
        }
        else if(hoeveelheidPercentage >= 40){
            return 2;
        }
        else{
            return 1;
        }

       
    }
}
 */

function rightTemperature(data) {
    const maxTemp = 15;
    const minTemp = 5;
    const chosenDate = dateInput.value;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const temp = data.hourly.temperature_2m[index];
            if (temp > maxTemp || temp < minTemp) {
                display(`Not the right temperature: ${temp}${data.hourly_units.temperature_2m}`, 'temp')
            }
            if(temp >= minTemp && temp <= maxTemp){
                totalScorePlanting += 1.0;
            }
            if(temp > maxTemp && temp < 20){
                totalScorePlanting += 0.5;
            }
            if(temp < minTemp && temp > 2){
                totalScorePlanting += 0.5;
            }
        }
    });

}

function checkPrecipitation(data) {
    // 0 tot max 2 mm per dag en minder dan 20% precipitation voor het planten zelf (en 2-3 dagen ervoor)
    // 15 tot 25 mm opgeteld over 7 - 14 dagen en 50% precipitation voor de 1-2 weken erna
    // voor het PoC ga ik nu uit van alleen planten
    const maxMm = 2;
    const maxProbability = 20;
    const chosenDate = dateInput.value;
    const hourlyData = data.hourly;
    const hourlyUnits = data.hourly_units;

    hourlyData.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const mm = hourlyData.precipitation[index];
            const probability = hourlyData.precipitation_probability[index];

            if (mm > maxMm || probability > maxProbability) {
                display(`Too wet: ${mm}${hourlyUnits.precipitation}, ${probability}${hourlyUnits.precipitation_probability}`)
            }

            if(mm <= maxMm && probability <= maxProbability){
                totalScorePlanting += 1.0;
            }
            if(mm > maxMm && mm < 5 && probability <= maxProbability){
                totalScorePlanting += 0.5;
            }
            if(mm <= maxMm && probability > maxProbability && probability < 40){
                totalScorePlanting += 0.5;
            }

        }
    })
}

// 3categorieen in 1 
function checkSoilMoisture(data) {
    const minMoisture1_3cm = 0.18;
    const maxMoisture1_3cm = 0.28;

    const minMoisture3_9cm = 0.200;
    const maxMoisture3_9cm = 0.300;

    const minMoisture9_27cm = 0.220;
    const maxMoisture9_27cm = 0.320;
    const chosenDate = dateInput.value;

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
            //1-3cm het belangrijkste bij het planten
            if(moisture1_3cm >= minMoisture1_3cm && moisture1_3cm <= maxMoisture1_3cm){
                totalScorePlanting += 1.0;
            }
            if(moisture1_3cm > maxMoisture1_3cm && moisture1_3cm < 0.35){
                totalScorePlanting += 0.5;
            }
            if(moisture1_3cm < minMoisture1_3cm && moisture1_3cm > 0.10){
                totalScorePlanting += 0.5;
            }

        }
    });
}

function rightSoilTemperature(data) {
    const minTemp = 5;
    const maxTemp = 15;
    const chosenDate = dateInput.value;

    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const temp = data.hourly.soil_temperature_6cm[index];
             if (temp < minTemp || temp > maxTemp) {
                 display(`Soil temperature not good: ${temp}${data.hourly_units.soil_temperature_6cm}`, 'temp');
             }
            if(temp >= minTemp && temp <= maxTemp){
                totalScorePlanting += 1.0;
            }
            if(temp > maxTemp && temp < 20){
                totalScorePlanting += 0.5;
            }
            if(temp < minTemp && temp > 2){
                totalScorePlanting += 0.5;
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
    //let barChart = null;

    const data = await fetchData(paramString);
    console.log(data);
    Array.from(mainBody.children).forEach((child) => {
        if (child.nodeName == "P") {
            child.remove();
        }
    })
    const chosenDate = dateInput.value;
    const weekdatums = getAWeekAfterDate(chosenDate);
    const scores = weekdatums.map(datum => calculatePlantingScore(data, datum));
    
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
    createChart(weekdatums, scores);

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
    return datums;
}




function createChart(datums,scores){
  const ctx = document.getElementById('myChart');

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
        label: 'Planting advice',
        data: scores, 
        backgroundColor: barColors,
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

}


