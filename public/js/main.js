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
        //element.textContent = `Couldn't load weatherinformation`;
        console.error(error);
    }
    return {};
}

async function tooMuchWind(data) {
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

async function rightTemperature(data) {
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

function display(tekst, id) {
    let newElement = document.createElement(`p`);
    newElement.id = id;
    newElement.innerText = tekst;
    mainBody.appendChild(newElement);
}

async function checkPlanting() {
    const data = await fetchData();
    Array.from(mainBody.children).forEach((child) => {
        if (child.nodeName == "P") {
            child.remove();
        }
    })
    tooMuchWind(data);
    rightTemperature(data);
}
