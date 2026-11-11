import http from 'k6/http';     // http bevat functies voor HTTP-requests, zoals GET en POST
import { check } from 'k6';     // check() controleert of response aan vorowaardse voldoet.

export const options = {
    scenarios: {
        growing_traffic: {
            executor: 'ramping-arrival-rate', 
            // executor = bepaalt hoe k6 test uitvoert, ramping-arrival-rate = verhoogt/verlaagt startfrequentie iteraties
             // iterations = hoe vaak testfunctie wordt uitgevoerd
            startRate: 1,
            timeUnit: '1s',

            preAllocatedVUs: 1000, // reserveert vooraf vijf virtuele gebruikers
            maxVUs: 2000, // VUs = Virtual User

            stages: [
                { duration: '120s', target: 2000 }
            ],
        },
    },
};

export default function () {
const response = http.get(__ENV.TARGET_URL);
    // __ENV.TARGET_URL > via een omgevingsvariabele bepalen welke website je test.
    // smoketest = Get-Content -Raw .\loadtest\traffic.js | docker run --rm -i -e TARGET_URL="http://145.52.126.137/" grafana/k6:latest run --once -

    check(response, {
        'HTTP status 200': (r) => r.status === 200,     // Check of server antwoordt met HTTP-statuscode 200 (OK)
    });
}
