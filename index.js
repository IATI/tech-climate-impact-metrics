require('./config/db/database');
const { sub, add, endOfYesterday } = require('date-fns');
const { BlobServiceClient } = require('@azure/storage-blob');
const {
    getMetricCost,
    getRawCost,
    getAllResources,
    getACU,
    getDbCompute,
    getTotalValue,
    getAvgValue,
    getCPU,
} = require('./metrics/azure');
const { getGAandLHmetrics, avgGAandLH } = require('./metrics/google');
const config = require('./config/config');
const cost = require('./config/db/metrics/cost');
const acu = require('./config/db/metrics/acu');
const dbCompute = require('./config/db/metrics/dbCompute');
const avgCPU = require('./config/db/metrics/avgCPU');
const tti = require('./config/db/metrics/tti');
const totalByteWeight = require('./config/db/metrics/totalByteWeight');
const avgServerRes = require('./config/db/metrics/avgServerRes');

const byteToGiB = (bytes) => Number(bytes / (1024 * 1024 * 1024)).toFixed(2);
const byteToMiB = (bytes) => Number(bytes / (1024 * 1024)).toFixed(2);

const logSave = (object) => {
    console.log(`Saving to DB - ${object.type} `);
};

const runMetrics = async () => {
    // Prepare start and end dates
    const endDate = endOfYesterday();
    let startDate = sub(endDate, { days: config.DAYS_BACK });
    startDate = add(startDate, { seconds: 1 });

    console.log('JavaScript timer trigger function ran!', endDate.toISOString());

    try {
        // Get GiB of IATI Data (denominator)
        const blobServiceClient = BlobServiceClient.fromConnectionString(
            config.AZURE_BLOB_CONNECTION_STRING
        );
        const containerClient = blobServiceClient.getContainerClient(
            config.AZURE_BLOB_IATI_CONTAINER
        );
        let iatiBytes = 0;
        // eslint-disable-next-line no-restricted-syntax
        for await (const blob of containerClient.listBlobsFlat()) {
            iatiBytes += blob.properties.contentLength;
        }
        const gibIATI = byteToGiB(iatiBytes);

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
        const GAandLAdata = avgGAandLH(await getGAandLHmetrics(3));

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

(async () => {
    await runMetrics();
    process.exit();
})();
