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

    let indexArray = [];
    console.log(data)
    //for(let i = 0; i<data.hourly)
}

tooMuchWind();