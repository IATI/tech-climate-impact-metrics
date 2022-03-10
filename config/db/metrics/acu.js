const MetricModel = require('../models/metric');

module.exports = new MetricModel({
    type: 'acu',
    displayName: 'Azure Compute Units (ACU)',
    description:
        'The concept of the Azure Compute Unit (ACU) provides a way of comparing compute (CPU) performance across Azure servers. Reducing the number of ACU units to perform the same workload uses less resources.',
    unit: 'ACU/GiB IATI',
    unitDescription: 'ACU per GibiByte of Published IATI Data',
});
