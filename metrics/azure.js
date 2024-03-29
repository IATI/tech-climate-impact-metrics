import fetch, { Headers } from 'node-fetch';
import { BlobServiceClient } from '@azure/storage-blob';
import config from '../config/config.js';
import getBearerToken from '../config/azureAPI.js';

const byteToGiB = (bytes) => Number(bytes / (1024 * 1024 * 1024)).toFixed(2);

const getGbIATI = async () => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
        config.AZURE_BLOB_CONNECTION_STRING,
    );
    const containerClient = blobServiceClient.getContainerClient(config.AZURE_BLOB_IATI_CONTAINER);
    let iatiBytes = 0;
    // eslint-disable-next-line no-restricted-syntax
    for await (const blob of containerClient.listBlobsFlat()) {
        iatiBytes += blob.properties.contentLength;
    }
    return byteToGiB(iatiBytes);
};

const getMetricCost = (rawCost) => {
    const total = rawCost.properties.rows.reduce(
        (acc, val) => Number(acc) + Number(val[1]),
        Number(0),
    );
    return { cost: total.toFixed(2), currency: 'USD' };
};

const getRawCost = async (startDate, endDate) => {
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
            requestOptions,
        );

        const data = await response.json();

        return data;
    } catch (error) {
        console.error(error);
        return error;
    }
};

const getAllResources = async () => {
    const token = await getBearerToken();

    const myHeaders = new Headers();
    myHeaders.append('Authorization', `Bearer ${token.access_token}`);
    myHeaders.append('Content-Type', 'application/json');

    const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
    };

    const response = await fetch(
        `https://management.azure.com/subscriptions/${config.AZURE_SUBSCRIPTION_ID}/resources?api-version=2021-04-01`,
        requestOptions,
    );

    const data = await response.json();

    return data.value;
};

const getTotalValue = (array) =>
    array.reduce((acc, val) => {
        const res = acc + Number(val.value);
        return res;
    }, 0);

const getAvgValue = (array) => getTotalValue(array) / array.length;

const getACU = async (resources) =>
    resources.reduce((result, resource) => {
        if (
            'tags' in resource &&
            'ACU' in resource.tags &&
            (resource.tags.ACU === 'true' || resource.tags.ACU === 'True')
        ) {
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

const getDbCompute = (resources) =>
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

const getCPU = async (resources, startDate, endDate) => {
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
                resource.type !== 'Microsoft.Compute/virtualMachineScaleSets' &&
                resource.type !== 'Microsoft.Web/sites' &&
                resource.type !== 'Microsoft.ManagedIdentity/userAssignedIdentities'
            ) {
                const requestOptions = {
                    method: 'GET',
                    headers: myHeaders,
                    redirect: 'follow',
                };

                let url = new URL(
                    `https://management.azure.com${resource.id}/providers/microsoft.Insights/metrics`,
                );
                url.searchParams.set(
                    'timespan',
                    `${startDate.toISOString()}/${endDate.toISOString()}`,
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
                        url.searchParams.set('metricnames', 'cpuUsagePercentage');
                        url.searchParams.set('metricNamespace', 'insights.container/nodes');
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
                            'ai.include-metadata,ai.ignoreInvalidFilterDimensions=true',
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
                        if (
                            data[0].body.value['performanceCounters/processCpuPercentageTotal']
                                .avg !== undefined
                        ) {
                            result.push({
                                metric: 'avgCPU',
                                value: data[0].body.value[
                                    'performanceCounters/processCpuPercentageTotal'
                                ].avg,
                                resourceType: resource.type,
                                resourceId: resource.id,
                            });
                        }
                        break;
                    default:
                        if (data.value[0].timeseries[0].data[0].average !== undefined) {
                            result.push({
                                metric: 'avgCPU',
                                value: data.value[0].timeseries[0].data[0].average,
                                resourceType: resource.type,
                                resourceId: resource.id,
                            });
                        }
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

export {
    getGbIATI,
    getMetricCost,
    getRawCost,
    getAllResources,
    getACU,
    getDbCompute,
    getTotalValue,
    getAvgValue,
    getCPU,
};
