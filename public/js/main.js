const mainBody = document.getElementById("mainBody");

async function fetchData() {
    try {
        const response = await fetch('127.0.0.1:3000/api/v1/data');
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

function tooMuchWind() {
    const data = fetchData();
    const chosenDate = '2026-10-18';
    const maxWind = 10;


    data.hourly.time.forEach((time, index) => {
        if (time.startsWith(chosenDate)) {
            const wind = data.hourly.wind_speed_10m[index];
            if (wind => maxWind) {
                display(`Hella Windy: ${wind}`, 'wind')
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
tooMuchWind();