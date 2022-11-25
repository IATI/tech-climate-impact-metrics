import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import { getPageViews } from './plausible.js';

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
        if (
            lhRes.runtimeError !== undefined &&
            (lhRes.runtimeError.code === 'NOT_HTML' ||
                lhRes.runtimeError.code === 'ERRORED_DOCUMENT_REQUEST')
        ) {
            return [...next];
        }

        return [
            ...next,
            {
                path: `${baseUrl}${pagePath}`,
                TTI: lhRes.audits.interactive.numericValue,
                totalByteWeight: lhRes.audits.diagnostics.details.items[0].totalByteWeight,
            },
        ];
    }, []);

const flattenLHData = (data) => data.reduce((acc, domainData) => acc.concat(domainData.value), []);

const getLHMetrics = async (domainList, period, numPages) => {
    const queryResults = await domainList.reduce(async (acc, domain) => {
        const nextAcc = await acc;

        const topPages = await getPageViews(domain.siteId, period, numPages);

        const paths = topPages.map((page) => page.page);

        const lhResults = await runLighthouseLoop(`https://${domain.siteId}`, paths);

        nextAcc.push({ domain, value: lhResults });

        return acc;
    }, []);

    return queryResults;
};

export { getLHMetrics, flattenLHData };
