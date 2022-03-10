const MetricModel = require('../models/metric');

module.exports = new MetricModel({
    type: 'avgServerRes',
    displayName: 'Average Server Response Time',
    description:
        'The time for a backend server to respond to a user request, including the network time from the user’s location to the backend server. The shorter distance the data has to travel to the user, the faster the server might respond with the data. Therefore faster response times correlate to shorter distances travelled and less resources used to move that data.',
    unit: 'seconds',
    unitDescription: 'Average Server Response Time across top IATI webpages',
});
