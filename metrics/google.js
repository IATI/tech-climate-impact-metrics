const { google } = require('googleapis');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const path = require('path');
const config = require('../config/config');

const analyticsreporting = google.analyticsreporting('v4');

const initAuth = async () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join('./', config.GOOGLE_APPLICATION_CREDENTIALS_FILENAME),
        scopes: ['https://www.googleapis.com/auth/analytics'],
    });
    google.options({ auth });
};

const runAnalyticsReport = async (requestObject) => {
    const res = await analyticsreporting.reports.batchGet({
        requestBody: {
            reportRequests: [requestObject],
        },
    });
    return res.data;
};

const getTopUrls = (resultBody, num) =>
    resultBody.reports[0].data.rows.splice(0, num).map((val) => val.dimensions[0]);

const runLighthouse = async (url, verbose) => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
        output: 'json',
        onlyAudits: ['interactive', 'diagnostics'],
        port: chrome.port,
    };
    const runnerResult = await lighthouse(url, options);

    // `.lhr` is the Lighthouse Result as a JS object
    if (verbose) {
        console.log('Lighthouse Report is done for', runnerResult.lhr.finalUrl);
        console.log('Time to interactive was', runnerResult.lhr.audits.interactive.numericValue);
        console.log(
            'totalByteWeight was',
            runnerResult.lhr.audits.diagnostics.details.items[0].totalByteWeight
        );
    }

    await chrome.kill();

    return runnerResult.lhr;
};

const runLighthouseLoop = async (baseUrl, paths) =>
    paths.reduce(async (acc, pagePath) => {
        const next = await acc;
        const lhRes = await runLighthouse(baseUrl + pagePath, false);
        return [
            ...next,
            {
                path: `${baseUrl}${pagePath}`,
                TTI: lhRes.audits.interactive.numericValue,
                totalByteWeight: lhRes.audits.diagnostics.details.items[0].totalByteWeight,
            },
        ];
    }, []);

module.exports.avgGAandLH = (queryResults) => {
    const res = queryResults.map((val) =>
        val.queriesResults.map((queryRes) => {
            if (queryRes.name === 'avgServerResponseTime') {
                return { avgServerResponseTime: Number(queryRes.values[0]) };
            }
            if (queryRes.name === 'lhMetricsbyTopPageviews') {
                return queryRes.values.reduce(
                    (subAcc, curVal, i) => {
                        const next = {};
                        next.TTI = subAcc.TTI + curVal.TTI;
                        next.totalByteWeight = subAcc.totalByteWeight + curVal.totalByteWeight;
                        if (i === queryRes.values.length - 1) {
                            next.TTI /= queryRes.values.length;
                            next.totalByteWeight /= queryRes.values.length;
                        }
                        return next;
                    },
                    { TTI: 0, totalByteWeight: 0 }
                );
            }
            return {};
        })
    );
    return res.reduce(
        (acc, val, i) => {
            const next = {};
            val.forEach((obj) => {
                Object.keys(obj).forEach((key) => {
                    next[key] = acc[key] + obj[key];
                });
            });
            if (i === res.length - 1) {
                Object.keys(next).forEach((key) => {
                    next[key] /= res.length;
                });
            }
            return next;
        },
        { avgServerResponseTime: 0, TTI: 0, totalByteWeight: 0 }
    );
};

module.exports.getGAandLHmetrics = async (numberPages) => {
    initAuth();

    const views = [
        {
            name: 'validator',
            viewId: '228786876',
            baseUrl: 'https://iativalidator.iatistandard.org',
        },
        {
            name: 'website',
            viewId: '44934478',
            baseUrl: 'https://www.iatistandard.org',
        },
    ];

    const queries = [
        {
            name: 'avgServerResponseTime',
            queryExp: {
                dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
                metrics: [{ expression: 'ga:avgServerResponseTime' }],
            },
        },
        {
            name: 'lhMetricsbyTopPageviews',
            limit: numberPages,
            queryExp: {
                dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
                metrics: [{ expression: 'ga:pageviews' }],
                dimensions: [{ histogramBuckets: [null], name: 'ga:pagePath' }],
                orderBys: [{ fieldName: 'ga:pageviews', sortOrder: 'DESCENDING' }],
            },
        },
    ];

    const queryResults = await views.reduce(async (viewAcc, view) => {
        const nextView = await viewAcc;
        const queriesResults = await queries.reduce(async (acc, query) => {
            const next = await acc;
            const { queryExp } = query;
            const reportQuery = {
                viewId: view.viewId,
                ...queryExp,
            };
            const reportRes = await runAnalyticsReport(reportQuery);
            if (query.name === 'avgServerResponseTime') {
                return [
                    ...next,
                    {
                        name: query.name,
                        values: reportRes.reports[0].data.totals[0].values,
                    },
                ];
            }
            if (query.name === 'lhMetricsbyTopPageviews') {
                return [
                    ...next,
                    {
                        name: query.name,
                        limit: query.limit,
                        values: await runLighthouseLoop(
                            view.baseUrl,
                            getTopUrls(reportRes, query.limit)
                        ),
                    },
                ];
            }
            return next;
        }, []);
        return [...nextView, { view, queriesResults }];
    }, []);

    return queryResults;
};
