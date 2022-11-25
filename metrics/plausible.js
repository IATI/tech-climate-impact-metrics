import fetch from 'node-fetch';
import config from '../config/config.js';

const PLAUSIBLE_API_BASE = 'https://plausible.io/api/v1';
const myHeaders = {
    Authorization: `Bearer ${config.PLAUSIBLE_API_KEY}`,
    'Content-Type': 'application/json',
};

const getPageViews = async (siteId, period, limit) => {
    const path = '/stats/breakdown';
    const url = new URL(`${PLAUSIBLE_API_BASE}${path}`);
    url.searchParams.set('property', 'event:page');
    url.searchParams.set('site_id', siteId);
    url.searchParams.set('period', period);
    url.searchParams.set('limit', limit);

    const res = await fetch(url, { headers: myHeaders });

    const body = await res.json();
    if (res.status !== 200)
        throw new Error(
            `Error fetching from ${url.pathname}. Status: ${res.status} Message: ${body.error} `
        );
    return body.results;
};

const getEventStats = async (siteId, period, eventName, eventLabel) => {
    const path = '/stats/breakdown';
    const url = new URL(`${PLAUSIBLE_API_BASE}${path}`);
    url.searchParams.set('property', `event:props:${eventLabel}`);
    url.searchParams.set('filters', `event:name==${eventName}`);
    url.searchParams.set('site_id', siteId);
    url.searchParams.set('period', period);

    const res = await fetch(url, { headers: myHeaders });

    const body = await res.json();
    if (res.status !== 200)
        throw new Error(
            `Error fetching file from github api. Status: ${res.status} Message: ${body.error} `
        );
    return body.results;
};

const getAvgServerResForDomain = async (domain, period) => {
    const rawStats = await getEventStats(domain, period, 'TTFB', 'event_label');

    if (rawStats.length < 1) throw Error('No stats received from Plausible API');

    // sum up so we can average
    const { visitors, responseTime } = rawStats.reduce(
        (acc, val) => {
            acc.visitors += Number(val.visitors);
            acc.responseTime += Number(val.event_label);

            return acc;
        },
        { visitors: 0, responseTime: 0 }
    );

    // return average
    return responseTime / visitors;
};

const getAvgServerResForDomains = async (domainList, period) => {
    const queryResults = await domainList.reduce(async (acc, domain) => {
        const nextAcc = await acc;

        const domainAvg = await getAvgServerResForDomain(domain.siteId, period);

        nextAcc.push({ domain, metric: 'avgServerResponseTime', value: domainAvg, unit: 'ms' });

        return acc;
    }, []);

    return queryResults;
};

export { getPageViews, getEventStats, getAvgServerResForDomains };
