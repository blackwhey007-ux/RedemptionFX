<!-- ad7c77a4-4f43-46f7-87cc-948817253157 f870d44e-0b52-4c63-b527-6b631c69852b -->
# Fix CopyFactory Initialization

1. Update `src/lib/copyfactoryClient.ts`

- Import `CopyFactory` class from `metaapi.cloud-sdk`.
- Instantiate a shared CopyFactory client with the default token, validating availability.
- Update `getMetaApiClients` to build both MetaApi and CopyFactory clients for custom tokens, throwing clear errors if instantiation fails.

2. Adjust API usage

- Ensure all helper functions in `copyfactoryClient.ts` reference the new CopyFactory client instance returned by `getMetaApiClients`.
- Add explicit error logs when CopyFactory APIs are missing to aid troubleshooting.

3. Verify admin endpoint behavior

- Confirm `/api/copyfactory/master` uses the updated helper and returns meaningful error messages if permissions are still missing.

### To-dos

- [x] Create ApiSetupSimple with token/accountId/region and action buttons
- [x] Replace ApiSetupPanel with ApiSetupSimple in VIP Sync page
- [x] Add POST handler to mt5-test-connection to accept credentials
- [x] Update testMetaAPIConnection to accept region and thread it
- [x] Hook Start/Stop buttons to existing streaming endpoints