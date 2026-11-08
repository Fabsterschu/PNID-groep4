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

module.exports = produceSettings;