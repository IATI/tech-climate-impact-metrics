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
            `Error fetching file from github api. Status: ${res.status} Message: ${body.error} `
        );
    return body;
};

export default getPageViews;
