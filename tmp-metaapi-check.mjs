import MetaApi from "metaapi.cloud-sdk";
import { readFileSync, unlinkSync } from "fs";
function parseEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    const lines = content.split(/\r?\n/);
    const env = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      env[key] = value;
    }
    return env;
  } catch (err) {
    return {};
  }
}
const envFile = parseEnvFile('.env.local');
const token = process.env.METAAPI_TOKEN || envFile.METAAPI_TOKEN;
if (!token) {
  console.error('Token not found');
  process.exit(1);
}
const accountId = process.env.MT5_ACCOUNT_ID || envFile.MT5_ACCOUNT_ID || '36a92028-5ec7-4dc6-8a50-09fea74a93db';
(async () => {
  try {
    console.log('Using token length:', token.length);
    console.log('Account ID:', accountId);
    const api = new MetaApi(token);
    const account = await api.metatraderAccountApi.getAccount(accountId);
    console.log('Account state:', account.state);
    console.log('Connection status:', account.connectionStatus);
    console.log('Region:', account.region, account.geographicalLocation, account.serverRegion);
    try {
      const provisioningProfile = await account.getProvisioningProfile();
      console.log('Provisioning profile:', provisioningProfile?.name, provisioningProfile?.region);
    } catch (err) {
      console.warn('Provisioning profile fetch failed:', err?.message);
    }
    try {
      const deployments = await account.getDeployments();
      console.log('Deployments:', deployments.map(d => ({id: d.id, state: d.state, connectionStatus: d.connectionStatus, region: d.region, broker: d.brokerName })));
    } catch (err) {
      console.warn('Deployments fetch failed:', err?.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
