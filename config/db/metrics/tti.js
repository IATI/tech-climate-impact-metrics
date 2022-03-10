const MetricModel = require('../models/metric');

module.exports = new MetricModel({
    type: 'tti',
    displayName: 'Time to interactive',
    description:
        'Time to interactive (TTI) measures how long it takes a web page to become fully interactive.',
    unit: 'seconds',
    unitDescription: 'Average seconds to interactive across top IATI pages',
});
