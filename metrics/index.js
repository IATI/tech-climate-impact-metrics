import db from '../config/db/database.js';
import {
    getGbIATI,
    getMetricCost,
    getRawCost,
    getAllResources,
    getACU,
    getDbCompute,
    getTotalValue,
    getAvgValue,
    getCPU,
} from './azure.js';
import { getLHMetrics, flattenLHData } from './lighthouse.js';
import { getAvgServerResForDomains } from './plausible.js';
import cost from '../config/db/metrics/cost.js';
import acu from '../config/db/metrics/acu.js';
import dbCompute from '../config/db/metrics/dbCompute.js';
import avgCPU from '../config/db/metrics/avgCPU.js';
import tti from '../config/db/metrics/tti.js';
import totalByteWeight from '../config/db/metrics/totalByteWeight.js';
import avgServerRes from '../config/db/metrics/avgServerRes.js';
import config from '../config/config.js';
import domains from '../config/domains.js';

const byteToMiB = (bytes) => Number(bytes / (1024 * 1024)).toFixed(2);

const logSave = (object) => {
    console.log(`Saving to DB - ${object.type} `);
};

const avgOnKey = (array, key) =>
    array.reduce((acc, val) => acc + Number(val[key]), 0) / array.length;

const runMetrics = async (startDate, endDate) => {
    db.connect();
    console.log(`Running all metrics`);
    const periodString = `${config.DAYS_BACK}d`;

    try {
        // Get GiB of IATI Data (denominator)
        const gibIATI = await getGbIATI();

        // Azure Cost
        const costData = getMetricCost(await getRawCost(startDate, endDate));

        cost.startDate = startDate;
        cost.endDate = endDate;
        cost.value = costData.cost / gibIATI;

        logSave(cost);
        await cost.save();

        // Get All Azure Resources for Azure Metrics
        const allResources = await getAllResources();

        // ACU
        const acuData = getTotalValue(await getACU(allResources));

        acu.startDate = startDate;
        acu.endDate = endDate;
        acu.value = acuData / gibIATI;

        logSave(acu);
        await acu.save();

        // Database Compute
        const dbComputeData = getTotalValue(await getDbCompute(allResources));

        dbCompute.startDate = startDate;
        dbCompute.endDate = endDate;
        dbCompute.value = dbComputeData / gibIATI;

        logSave(dbCompute);
        await dbCompute.save();

        // CPU Utilization
        const cpuData = getAvgValue(await getCPU(allResources, startDate, endDate));

        avgCPU.startDate = startDate;
        avgCPU.endDate = endDate;
        avgCPU.value = cpuData / gibIATI;

        logSave(avgCPU);
        await avgCPU.save();

        /* Google Analytics Metrics:
        - Time To Interactive (TTI)
        - Page Weight (totalByteWeight)
        */
        const lhData = flattenLHData(
            await getLHMetrics(domains, periodString, config.NUMBER_PAGES)
        );

        tti.startDate = startDate;
        tti.endDate = endDate;
        tti.value = avgOnKey(lhData, 'TTI') / 1000; // ms to seconds

        logSave(tti);
        await tti.save();

        totalByteWeight.startDate = startDate;
        totalByteWeight.endDate = endDate;
        totalByteWeight.value = byteToMiB(avgOnKey(lhData, 'totalByteWeight'));

        logSave(totalByteWeight);
        await totalByteWeight.save();

        // Avg Server Response Time
        const avgServerResTimes = await getAvgServerResForDomains(domains, periodString);

        avgServerRes.startDate = startDate;
        avgServerRes.endDate = endDate;
        avgServerRes.value = avgOnKey(avgServerResTimes, 'value') / 1000; // average across domains, convert to ms

        logSave(avgServerRes);
        await avgServerRes.save();

        console.log(`All metrics saved`);
        return;
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

export default runMetrics;
