import { argv } from 'process';
import util from 'util';
import { sub, add, endOfYesterday } from 'date-fns';
import runMetrics from './metrics/index.js';
import {
    getGbIATI,
    getRawCost,
    getAllResources,
    getACU,
    getDbCompute,
    getCPU,
    getTotalValue,
} from './metrics/azure.js';
import { getLHMetrics } from './metrics/google.js';
import config from './config/config.js';
import domains from './config/domains.js';
import { getAvgServerResForDomains } from './metrics/plausible.js';

const log = (object) => console.log(util.inspect(object, false, null, true));

// Prepare start and end dates
const endDate = endOfYesterday();
let startDate = sub(endDate, { days: config.DAYS_BACK });
startDate = add(startDate, { seconds: 1 });
const periodString = `${config.DAYS_BACK}d`;

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
        log(await getGbIATI());
        break;
    case 'cost':
        log(await getRawCost(startDate, endDate));
        break;
    case 'acu':
        log(await getACU(await getAllResources()));
        break;
    case 'acu-total':
        log(getTotalValue(await getACU(await getAllResources())));
        break;
    case 'dbCompute':
        log(await getDbCompute(await getAllResources()));
        break;
    case 'avgCPU':
        log(await getCPU(await getAllResources(), startDate, endDate));
        break;
    case 'avgServerResponseTime':
        log(await getAvgServerResForDomains(domains, periodString));
        break;
    case 'lhMetrics':
        log(await getLHMetrics(domains, periodString, config.NUMBER_PAGES));
        break;
    default:
        break;
}
process.exit();
