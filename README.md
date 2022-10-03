# tech-climate-impact-metrics

Metrics Collector for IATI Technical Climate Impact Project

## Methodology

[TCI Measurement](https://docs.google.com/document/d/1GT5nm8Hm-PcBFujEQ_W4en1U-ueVrndxSfZqQ-CYSCA/edit?usp=sharing)

## Internal Wiki

[Measurement](https://github.com/IATI/IATI-Internal-Wiki/blob/main/Technical-Climate-Impact/Measurement.md)

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

## Metric Setup

### gbIATI

-   Relies on a Storage Account and Container that contains raw IATI XML

`AZURE_BLOB_CONNECTION_STRING`
`AZURE_BLOB_IATI_CONTAINER`

### cost

-   Uses the Azure Management API to pull Cost data for the supplied subscription, no additional setup required

### acu

-   Uses the tags `ACU=true` and `ACUvalue=<val>` on the Azure resources that should be counted towards total ACU.

#### Azure Container Instances (ACI)

-   Tags added during deployment with GitHub Actions: [link](https://github.com/IATI/refresher/blob/ca8e17c363d4b00bbf3638b3b41a97c533be04e9/.github/workflows/develop.yml#L134-L138)

#### Azure Functions

-   Consumption SKU Functions are not applicable, since there is not a dedicated server running this compute
-   Premium SKU Functions have tags added during deployment: [link](https://github.com/IATI/js-validator-api/blob/d0f8caca9dcde8e35224d3dd72af815debde563d/.github/workflows/develop-func-deploy.yml#L150-L159)

#### VMs

-   For manually created VMs, tags should be added manually. You may also need to delete/change tags to =false from Network resources, etc. that have the tags applied to them from the VM.
-   For IATI standard website, tags are added in to their VMs on deployment: [link](https://github.com/IATI/IATI-Standard-Website/blob/ca319d6567a0ab450a661cebb76370e72d50fd1f/.github/workflows/workflow.yml#L173-L177)

#### Azure Kubernetes Service (AKS)

-   ACU values should be calculated following the methodology and added to each Node Pool. This will apply the tags to the VM Scale Sets which is picked up by the metric script. This should also persist the tags between upgrades.

E.g.

```
az aks nodepool update \
    --resource-group myResourceGroup \
    --cluster-name myAKSCluster \
    --name contosoNodePool \
    --tags ACU=true ACU=600
```

### dbCompute

-   Counts the number of `vCores` of the resource type `Microsoft.DBforPostgreSQL/servers` using the Azure Management API

### avgCPU

-   Uses the tags `avgCPU=true` on the Azure resources that should be averaged to avgCPU.
-   Uses some more filtering in the code to ensure no double-counting, etc.

#### Azure Container Instances (ACI)

-   Tags added during deployment with GitHub Actions: [link](https://github.com/IATI/refresher/blob/ca8e17c363d4b00bbf3638b3b41a97c533be04e9/.github/workflows/develop.yml#L134-L138)
-   Uses `microsoft.Insights/metrics` API, for `Microsoft.ContainerInstance/containerGroups` resource type with `metricnames=CpuUsage`

#### PostgreSQL Database

-   Tags manually added
-   Uses `microsoft.Insights/metrics` API, for `Microsoft.DBforPostgreSQL/servers` resource type with `metricnames=cpu_percent`

#### Azure Functions

-   Consumption SKU Functions are not applicable, since there is not a dedicated server running this compute
-   Premium SKU Functions have tags added during deployment: [link](https://github.com/IATI/js-validator-api/blob/d0f8caca9dcde8e35224d3dd72af815debde563d/.github/workflows/develop-func-deploy.yml#L150-L159)
-   Uses management `/metrics` API, for `microsoft.insights/components` resource type with `metricId`: `performanceCounters/processCpuPercentageTotal`
-   Filters out `Microsoft.Web/sites` resource type to prevent duplicates

#### VMs

-   For manually created VMs, tags should be added manually
-   For IATI standard website, tags are added in to their VMs on deployment: [link](https://github.com/IATI/IATI-Standard-Website/blob/ca319d6567a0ab450a661cebb76370e72d50fd1f/.github/workflows/workflow.yml#L173-L177)

#### Azure Kubernetes Service (AKS)

-   `avgCPU=true` tag added to the AKS instances. Picked up by Metric code for 'Microsoft.ContainerService/managedClusters' resourceType.
-   Had to filter out 'Microsoft.ManagedIdentity/userAssignedIdentities' resourceType in metric run.

### Google Analytics and Lighthouse

-   Includes `Average Server Response Time`, `Page Weight`, and `Time to Interactive` metrics

#### Google Analytics "Views"

-   These are defined for each web property in this config file `config/gaViews.json`, the viewId is from Google Analytics

#### `NUMBER_PAGES`

-   Controls how many pages for each web property are evaluated for these metrics to create the average
