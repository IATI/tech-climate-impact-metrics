const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
    // Static
    type: {
        type: String,
        required: true,
    },
    displayName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    unit: {
        type: String,
        required: true,
    },
    unitDescription: {
        type: String,
        required: true,
    },
    // Dynamic
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    value: {
        type: Number,
        required: true,
    },
});

module.exports = mongoose.model('Metric', metricSchema);
