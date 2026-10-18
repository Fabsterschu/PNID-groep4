const mainBody = document.getElementById("mainBody");

async function fetchData() {
    try {
        const response = await fetch('/api/v1/data');
        if (!response.ok) {
            throw new Error('failed to fetch data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        element.textContent = `Couldn't load weatherinformation`;
        console.error(error);
    }
}

function tooMuchWind() {
    const data = fetchData();

}