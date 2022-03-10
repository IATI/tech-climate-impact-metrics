const db = require('../config/db/database');
const {
    getGbIATI,
    getMetricCost,
    getRawCost,
    getAllResources,
    getACU,
    getDbCompute,
    getTotalValue,
    getAvgValue,
    getCPU,
} = require('./azure');
const { getGAandLHmetrics, avgGAandLH } = require('./google');
const cost = require('../config/db/metrics/cost');
const acu = require('../config/db/metrics/acu');
const dbCompute = require('../config/db/metrics/dbCompute');
const avgCPU = require('../config/db/metrics/avgCPU');
const tti = require('../config/db/metrics/tti');
const totalByteWeight = require('../config/db/metrics/totalByteWeight');
const avgServerRes = require('../config/db/metrics/avgServerRes');
const config = require('../config/config');

const byteToMiB = (bytes) => Number(bytes / (1024 * 1024)).toFixed(2);

const logSave = (object) => {
    console.log(`Saving to DB - ${object.type} `);
};

module.exports.runMetrics = async (startDate, endDate) => {
    db.connect();
    console.log(`Running all metrics`);

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

        /* Google Analytics and Lighthouse Metrics:
        - Time To Interative
        - Avg Server Response Time
        - Page Weight
    */
        const GAandLAdata = avgGAandLH(await getGAandLHmetrics(config.NUMBER_PAGES));

        tti.startDate = startDate;
        tti.endDate = endDate;
        tti.value = GAandLAdata.TTI / 1000; // ms to seconds

        logSave(tti);
        await tti.save();

        totalByteWeight.startDate = startDate;
        totalByteWeight.endDate = endDate;
        totalByteWeight.value = byteToMiB(GAandLAdata.totalByteWeight);

        logSave(totalByteWeight);
        await totalByteWeight.save();

        avgServerRes.startDate = startDate;
        avgServerRes.endDate = endDate;
        avgServerRes.value = GAandLAdata.avgServerResponseTime;

        logSave(avgServerRes);
        await avgServerRes.save();

        console.log(`All metrics saved`);
        return;
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};
