const MetricModel = require('../models/metric');

module.exports = new MetricModel({
    type: 'totalByteWeight',
    displayName: 'Page Weight',
    description:
        'Page weight measures how many resources are transferred over the network from the backend servers to the browser to display the page. The lower this number is, the less resources used to transfer and render the web page.',
    unit: 'MiB',
    unitDescription: 'Average MebiBytes per page across top IATI webpages',
});
