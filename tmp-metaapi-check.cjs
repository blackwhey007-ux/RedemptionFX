const { readFileSync } = require('fs');
const sdk = require('metaapi.cloud-sdk');
const MetaApi = sdk.default || sdk;
const envLines = readFileSync('.env.local', 'utf8').split(/\r?\n/);
const tokenLine = envLines.find(line => line.startsWith('METAAPI_TOKEN='));
const accountLine = envLines.find(line => line.startsWith('MT5_ACCOUNT_ID='));
const token = process.env.METAAPI_TOKEN || (tokenLine ? tokenLine.split('=')[1] : null);
if (!token) {
  console.error('Token not found');
  process.exit(1);
}
const accountId = process.env.MT5_ACCOUNT_ID || (accountLine ? accountLine.split('=')[1] : '');
(async () => {
  try {
    console.log('Using token length:', token.length);
    console.log('Account ID:', accountId);
    const api = new MetaApi(token);
    const account = await api.metatraderAccountApi.getAccount(accountId);
    console.log('Account state:', account.state);
    console.log('Connection status:', account.connectionStatus);
    console.log('Region:', account.region, account.geographicalLocation, account.serverRegion);
  } catch (error) {
    console.error('Error:', error);
  }
})();
