const { argv } = require('process');
const util = require('util');
const { sub, add, endOfYesterday } = require('date-fns');
const { runMetrics } = require('./metrics/index');
const {
    getGbIATI,
    getRawCost,
    getAllResources,
    getACU,
    getDbCompute,
    getCPU,
} = require('./metrics/azure');
const { getGAandLHmetrics } = require('./metrics/google');
const config = require('./config/config');
const { getTotalValue } = require('./metrics/azure');

(async () => {
    // Prepare start and end dates
    const endDate = endOfYesterday();
    let startDate = sub(endDate, { days: config.DAYS_BACK });
    startDate = add(startDate, { seconds: 1 });

    console.log(
        `Running ${
            argv[2] !== undefined ? `${argv[2]} ` : ''
        }for range ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    switch (argv[2]) {
        case undefined:
            await runMetrics(startDate, endDate);
            break;
        case 'all':
            await runMetrics(startDate, endDate);
            break;
        case 'gbIATI':
            console.log(await getGbIATI());
            break;
        case 'cost':
            console.log(util.inspect(await getRawCost(startDate, endDate), false, null, true));
            break;
        case 'acu':
            console.log(await getACU(await getAllResources()));
            break;
        case 'acu-total':
            console.log(getTotalValue(await getACU(await getAllResources())));
            break;
        case 'dbCompute':
            console.log(await getDbCompute(await getAllResources()));
            break;
        case 'avgCPU':
            console.log(await getCPU(await getAllResources(), startDate, endDate));
            break;
        case 'GAandLH':
            console.log(
                util.inspect(await getGAandLHmetrics(config.NUMBER_PAGES), false, null, true)
            );
            break;
        default:
            break;
    }
    process.exit();
})();
