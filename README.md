# tech-climate-impact-metrics

Metrics Collector for IATI Technical Climate Impact Project

## Prerequisites

-   nvm - [nvm](https://github.com/nvm-sh/nvm) - Node version manager
-   Node LTS
    -   This will be the latest LTS version supported by Azure Functions, set in `.nvmrc`
    -   once you've installed nvm run `nvm use` which will look at `.nvmrc` for the node version, if it's not installed then it will prompt you to install it with `nvm install <version> --latest-npm`
-   npm >=7
    -   nvm will install the version of npm packaged with node. make sure to use the `--latest-npm` flag to get the latest version
    -   If you forgot to do that install the latest version of npm with `npm i -g npm`

## Environment Variables

-   Copy example `cp .env.example .env`

### Azure REST API

-   To get Azure Credentials run `az ad sp create-for-rbac --role Contributor --scopes /subscriptions/<subscriptionId>` Azure CLI command [link](https://blog.jongallant.com/2021/02/azure-rest-apis-postman-2021/)

subscriptionId -> AZURE_SUBSCRIPTION_ID

Response from az cli:

```json
{
    "appId": "xxx",
    "displayName": "xx",
    "password": "xxx",
    "tenant": "xxx"
}
```

appId -> AZURE_CLIENT_ID
password -> AZURE_CLIENT_SECRET
tenant -> AZURE_TENANT_ID

### Azure Blob

These provide the connection to the blob container that stores all of IATI xml to get the GiB of Published IATI metric.

AZURE_BLOB_CONNECTION_STRING - In the Azure Portal for the Storage Account (iatiprod) > Access Keys > Connection String
AZURE_BLOB_IATI_CONTAINER - Name of the container that has IATI xml (source)

### MongoDB

Sign in to the MongoDB Atlas account https://account.mongodb.com/account/login (credentials in 1Pass). Click "Connect" to get the server name. The password for the db user is in 1Pass as well. Port is not required for the connection to the cloud db.

DB_HOST
DB_USER
DB_PASSWORD
DB_PORT
DB_NAME

### Google Analytics

Uses a service account: https://github.com/googleapis/google-api-nodejs-client#service-account-credentials

You need to download the .json file into the root of the project directory, then put the name of the file in GOOGLE_APPLICATION_CREDENTIALS_FILENAME

## Running Metrics

-   Install dependencies `npm i`
-   Run all and save in DB `npm start`
-   Run a specific metric and get raw data (not saved in DB):
    -   `node index.js <type>` where type is one of:
        -   `gbIATI` - GiB of IATI in the source blob container
        -   `cost` - Azure Cost
        -   `acu` - ACU
        -   `dbCompute` - Database Compute
        -   `avgCPU` - Avg CPU %
        -   `GAandLH` - Avg Server Response Time, Time to Interactive, and Page Weight metrics
