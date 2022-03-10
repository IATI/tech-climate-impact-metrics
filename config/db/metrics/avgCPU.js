const MetricModel = require('../models/metric');

module.exports = new MetricModel({
    type: 'avgCPU',
    displayName: 'Server Utilisation %',
    description: `The percentage of the CPU processing power that is being used by the processes running on it. Increasing utilisation means that you aren't wasting processing power by having it sit idle. Given the resources that go into physically manufacturing a server, having part of it sit idle is a waste of those resources. `,
    unit: 'CPU Percentage/GiB IATI',
    unitDescription: 'CPU Percentage per GibiByte of Published IATI Data',
});
