const MetricModel = require('../models/metric');

module.exports = new MetricModel({
    type: 'dbCompute',
    displayName: 'Database Compute',
    description:
        'Database Compute (vCores) represent the logical CPU of the underlying hardware running the Databases on Azure.',
    unit: 'vCores/GiB IATI',
    unitDescription: 'vCores per GibiByte of Published IATI Data',
});
