const MetricModel = require('../models/metric');

module.exports = new MetricModel({
    type: 'cost',
    displayName: 'Cloud Computing Cost - Azure',
    description:
        'The cost of Microsoft Azure Cloud resources (servers, storage, databases, etc.), where the IATI Unified Platform is hosted, to the IATI Technical Team',
    unit: '$/GiB IATI',
    unitDescription: 'Cost in USD per GibiByte of Published IATI Data',
});
