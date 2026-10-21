const mainBody = document.getElementById("mainBody");
const plantButton = document.getElementById("plantButton");
const dateInput = document.getElementById("dateInput");

plantButton.addEventListener(("click"), (clickEvent) => checkPlanting()) 

async function fetchData() {
    try {
        const response = await fetch('/api/v1/data');
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



    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const wind = data.hourly.wind_speed_10m[index];
            if (wind >= maxWind) {
                display(`Hella Windy: ${wind}${data.hourly_units.wind_speed_10m}`, 'wind')
            }
        }
    });
}

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
    const hourlyUnits= data.hourly_units;

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

function rightSoilMoisture_1_3cm(data){
    const minMoisture = 0.18;
    const maxMoisture = 0.28;
    const chosenDate = dateInput.value;

    data.hourly.time.forEach((time, index) => {
        if(time.startsWith(chosenDate)){
            const moisture = data.hourly.soil_moisture_1_to_3cm[index];
           
            if( moisture < minMoisture || moisture > maxMoisture){
                display(`Soil moisture 1-3cm not right: ${moisture}${data.hourly_units.soil_moisture_1_to_3cm}`, 'moisture');
            }
        }
    });

}

function rightSoilMoisture_3_9cm(data){
    const minMoisture = 0.200;
    const maxMoisture = 0.300;
    const chosenDate = dateInput.value;

    data.hourly.time.forEach((time, index) => {
        if(time.startsWith(chosenDate)){
            const moisture = data.hourly.soil_moisture_3_to_9cm[index];
           if( moisture < minMoisture || moisture > maxMoisture){
                display(`Soil moisture 3-9cm not right: ${moisture}${data.hourly_units.soil_moisture_3_to_9cm}`, 'moisture');
           }
        }

    });
} 

function rightSoilMoisture_9_27cm(data){
    const minMoisture = 0.220;
    const maxMoisture = 0.320;
    const chosenDate = dateInput.value;

    data.hourly.time.forEach((time, index) => {
        if(time.startsWith(chosenDate)){
            const moisture = data.hourly.soil_moisture_9_to_27cm[index];
           if( moisture < minMoisture || moisture > maxMoisture){
                display(`Soil moisture 9-27cm not right: ${moisture}${data.hourly_units.soil_moisture_9_to_27cm}`, 'moisture');
           }
        }

    });

}

function rightSoilTemperature(data){
    const minTemp = 5;
    const maxTemp = 15;
    const chosenDate = dateInput.value;

    data.hourly.time.forEach((time, index) => {
        if(time.startsWith(chosenDate)){
            const temp = data.hourly.soil_temperature_6cm[index];
            if( temp < minTemp || temp > maxTemp){
                display(`Soil temperature not good: ${temp}${data.hourly_units.soil_temperature_6cm}`, 'temp');
            }
        }
    });
}

    

function display(tekst, id) {
    let newElement = document.createElement(`p`);
    newElement.id = id;
    newElement.innerText = tekst;
    mainBody.appendChild(newElement);
}


async function checkPlanting() {
    const data = await fetchData();
    console.log(data);
    Array.from(mainBody.children).forEach((child) => {
        if (child.nodeName == "P") {
            child.remove();
        }
    })
    tooMuchWind(data);
    rightTemperature(data);
    checkPrecipitation(data);
    rightSoilMoisture_1_3cm(data);
    rightSoilMoisture_3_9cm(data);
    rightSoilMoisture_9_27cm(data);
    rightSoilTemperature(data);

}


