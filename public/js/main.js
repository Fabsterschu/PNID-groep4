const mainBody = document.getElementById("mainBody");
const plantButton = document.getElementById("inputButton");
const dateInput = document.getElementById("dateInput");
const formData = document.getElementById("dataForm");
const produceButton = document.getElementById("produceButton");
const produceOptions = document.querySelectorAll(".produceOptions button");

let plantenChart = null;
let hourlyChart = null;
let selectedProduce = "summerWheat";


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
        searchParams.append("produce", selectedProduce);

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


function getStarRating(score) {
    return "⭐".repeat(score || 1);
}

async function checkPlanting(paramString) {
    // const settings = produceSettings[selectedProduce] || produceSettings.summerWheat;
    // const data = await fetchData(paramString);

    const weekResults = await fetchData(paramString); //await wacht tot het is afgelopen (note for zelf)

    if(weekResults.length === 0){
        console.error(`Didn't get any data from weekResults`);
        return;
    }
    const chosenDate = new Date().toISOString().split('T')[0];
    const weekdatums = getAWeekAfterDate(chosenDate);
    const dailyScores = weekResults.map(res=>res.dailyScore);

    
    createChart(weekdatums, dailyScores, weekResults);
    
    const firstDay = weekResults[0];
    //Hoeft misschien niet, maar wijs uurgrafiek van gekozen datum direct
    createHourlyChart(firstDay.labels, firstDay.hourlyScores, chosenDate, firstDay.evaluations);
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

function createChart(datums, scores, weekResults) {
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

                    const clickedDayResult = weekResults[clickedIndex];
                    if(clickedDayResult){
                        createHourlyChart(clickedDayResult.labels, clickedDayResult.hourlyScores, clickedDate, clickedDayResult.evaluations);
                        //updateWarningBox(clickedDayResult, clickedDate);
                    }
                    
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
function createHourlyChart(labels, hourlyScores, datum, evaluations=[]) {
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
                        },
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            if (evaluations[index] && evaluations[index].warnings && evaluations[index].warnings.length > 0) {
                                return '\nWarnings:\n' + evaluations[index].warnings.map(w => `- ${w}`).join('\n');
                            }
                            return '';
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

/*
function updateWarningBox(dayResult, datum) {
    const infoBar = document.getElementById("detailedInfoBar");
    const warningCard = document.getElementById("warningCard");
    const warningTitle = document.getElementById("warningTitle");
    const warningStars = document.getElementById("warningStars");
    const noWarningsMsg = document.getElementById("noWarningsMessage");
    const warningList = document.getElementById("warningList");

    if (!infoBar || !warningCard) return;

    const dateObj = new Date(datum);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
    });

    const warnings = dayResult.warnings;
    const score = dayResult.dailyScore;
    const stars = getStarRating(score);

    warningCard.className = "warning-card";
    let statusTitle = "Poor Planting Conditions";
    
    if (score === 4) { 
        warningCard.classList.add("status-perfect"); 
        statusTitle = "Perfect Planting Conditions"; 
    } else if (score === 3) { 
        warningCard.classList.add("status-good"); 
        statusTitle = "Good Planting Conditions"; 
    } else if (score === 2) { 
        warningCard.classList.add("status-fair"); 
        statusTitle = "Fair Planting Conditions"; 
    } else { 
        warningCard.classList.add("status-poor"); 
    }

    warningTitle.textContent = `${statusTitle} - ${formattedDate}`;
    warningStars.textContent = `${stars} (${score}/4)`;

    warningList.innerHTML = "";

    if (warnings.length === 0) {
        noWarningsMsg.style.display = "block";
        warningList.style.display = "none";
    } else {
        noWarningsMsg.style.display = "none";
        warningList.style.display = "block";

        warnings.forEach(warningText => {
            const li = document.createElement("li");
            li.textContent = `⚠️ ${warningText}`;
            warningList.appendChild(li);
        });
    }

    infoBar.style.display = "block";
}
    */