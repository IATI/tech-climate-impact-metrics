require('dotenv').config();
const { version } = require('../package.json');

module.exports = {
    APP_NAME: 'IATI TCI Metrics',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
    DB_HOST: process.env.DB_HOST,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_USER: process.env.DB_USER,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
    AZURE_SUBSCRIPTION_ID: process.env.AZURE_SUBSCRIPTION_ID,
    DAYS_BACK: process.env.DAYS_BACK || 7,
    AZURE_BLOB_CONNECTION_STRING: process.env.AZURE_BLOB_CONNECTION_STRING,
    AZURE_BLOB_IATI_CONTAINER: process.env.AZURE_BLOB_IATI_CONTAINER,
    GOOGLE_APPLICATION_CREDENTIALS_FILENAME: process.env.GOOGLE_APPLICATION_CREDENTIALS_FILENAME,
};
