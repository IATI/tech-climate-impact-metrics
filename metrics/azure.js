const fetch = require('node-fetch');
const { Headers } = require('node-fetch');
const { getBearerToken } = require('../config/azureAPI');
const config = require('../config/config');

module.exports.getMetricCost = (rawCost) => {
    const total = rawCost.properties.rows.reduce(
        (acc, val) => Number(acc) + Number(val[1]),
        Number(0)
    );
    return { cost: total.toFixed(2), currency: 'USD' };
};

module.exports.getRawCost = async (startDate, endDate) => {
    try {
        const token = await getBearerToken();

        const myHeaders = new Headers();
        myHeaders.append('Authorization', `Bearer ${token.access_token}`);
        myHeaders.append('Content-Type', 'application/json');

        const body = JSON.stringify({
            type: 'ActualCost',
            dataSet: {
                granularity: 'Daily',
                aggregation: {
                    totalCost: {
                        name: 'Cost',
                        function: 'Sum',
                    },
                    totalCostUSD: {
                        name: 'CostUSD',
                        function: 'Sum',
                    },
                },
                sorting: [
                    {
                        direction: 'ascending',
                        name: 'UsageDate',
                    },
                ],
            },
            timeframe: 'Custom',
            timePeriod: {
                from: startDate.toISOString(),
                to: endDate.toISOString(),
            },
        });

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body,
            redirect: 'follow',
        };

        const response = await fetch(
            `https://management.azure.com/subscriptions/${config.AZURE_SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2021-10-01`,
            requestOptions
        );

        const data = await response.json();

        return data;
    } catch (error) {
        console.error(error);
        return error;
    }
};

module.exports.getAllResources = async () => {
    const token = await getBearerToken();

    const myHeaders = new Headers();
    // auth
    // const token = await getBearerToken();
    myHeaders.append('Authorization', `Bearer ${token.access_token}`);
    myHeaders.append('Content-Type', 'application/json');

    const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
    };

    const response = await fetch(
        `https://management.azure.com/subscriptions/${config.AZURE_SUBSCRIPTION_ID}/resources?api-version=2021-04-01`,
        requestOptions
    );

    const data = await response.json();

    return data.value;
};

module.exports.getTotalValue = (array) =>
    array.reduce((acc, val) => {
        const res = acc + Number(val.value);
        return res;
    }, 0);

module.exports.getAvgValue = (array) => this.getTotalValue(array) / array.length;

module.exports.getACU = async (resources) =>
    resources.reduce((result, resource) => {
        if ('tags' in resource && 'ACU' in resource.tags && resource.tags.ACU === 'true') {
            let ACUvalue = null;
            if ('ACUvalue' in resource.tags) {
                ACUvalue = resource.tags.ACUvalue;
            }
            result.push({
                metric: 'ACU',
                value: ACUvalue,
                resourceId: resource.id,
            });
        }
        return result;
    }, []);

module.exports.getDbCompute = (resources) =>
    resources.reduce((result, resource) => {
        if (resource.type === 'Microsoft.DBforPostgreSQL/servers') {
            result.push({
                metric: 'dbCompute',
                value: resource.sku.capacity,
                unit: 'vCores',
                id: resource.id,
            });
        }
        return result;
    }, []);

module.exports.getCPU = async (resources, startDate, endDate) => {
    try {
        const token = await getBearerToken();

        const myHeaders = new Headers();
        // auth
        myHeaders.append('Authorization', `Bearer ${token.access_token}`);
        myHeaders.append('Content-Type', 'application/json');
        return await resources.reduce(async (resultP, resource) => {
            const result = await resultP;
            if (
                'tags' in resource &&
                'avgCPU' in resource.tags &&
                resource.tags.avgCPU === 'true' &&
                !resource.type.includes('Microsoft.Network') &&
                resource.type !== 'Microsoft.Compute/virtualMachineScaleSets'
            ) {
                const requestOptions = {
                    method: 'GET',
                    headers: myHeaders,
                    redirect: 'follow',
                };

                let url = new URL(
                    `https://management.azure.com${resource.id}/providers/microsoft.Insights/metrics`
                );
                url.searchParams.set(
                    'timespan',
                    `${startDate.toISOString()}/${endDate.toISOString()}`
                );
                url.searchParams.set('interval', 'FULL');
                url.searchParams.set('aggregation', 'average');
                url.searchParams.set('metricNamespace', resource.type);
                url.searchParams.set('validatedimensions', 'false');
                url.searchParams.set('api-version', '2019-07-01');

                switch (resource.type) {
                    case 'Microsoft.ContainerInstance/containerGroups':
                        url.searchParams.set('metricnames', 'CpuUsage');
                        break;
                    case 'Microsoft.ContainerService/managedClusters':
                        url.searchParams.set('metricnames', 'node_cpu_usage_percentage');
                        break;
                    case 'Microsoft.DBforPostgreSQL/servers':
                        url.searchParams.set('metricnames', 'cpu_percent');
                        break;
                    case 'Microsoft.Compute/virtualMachines':
                        url.searchParams.set('metricnames', 'Percentage CPU');
                        break;
                    case 'microsoft.insights/components':
                        url = new URL(`https://management.azure.com${resource.id}/metrics`);
                        url.searchParams.set('useKusto', 'true');
                        url.searchParams.set('useMDM', 'false');
                        url.searchParams.set(
                            'prefer',
                            'ai.include-metadata,ai.ignoreInvalidFilterDimensions=true'
                        );
                        url.searchParams.set('api-version', '2018-04-20');

                        requestOptions.method = 'POST';

                        requestOptions.body = JSON.stringify([
                            {
                                id: `${resource.id}performanceCounters/processCpuPercentageTotal#avg#Summary`,
                                parameters: {
                                    aggregation: 'avg',
                                    metricId: 'performanceCounters/processCpuPercentageTotal',
                                    orderby: 'avg desc',
                                    timespan: `${startDate.toISOString()}/${endDate.toISOString()}`,
                                    top: 10,
                                },
                            },
                        ]);
                        break;
                    default:
                        break;
                }

                const response = await fetch(url, requestOptions);

                const data = await response.json();
                if ('error' in data) {
                    throw new Error(data);
                }
                switch (resource.type) {
                    case 'microsoft.insights/components':
                        result.push({
                            metric: 'avgCPU',
                            value: data[0].body.value[
                                'performanceCounters/processCpuPercentageTotal'
                            ].avg,
                            resourceType: resource.type,
                            resourceId: resource.id,
                        });
                        break;
                    default:
                        result.push({
                            metric: 'avgCPU',
                            value: data.value[0].timeseries[0].data[0].average,
                            resourceType: resource.type,
                            resourceId: resource.id,
                        });

                        break;
                }
            }
            return result;
        }, []);
    } catch (error) {
        console.error(error);
        throw new Error(error);
    }
};
