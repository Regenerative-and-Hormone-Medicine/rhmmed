import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: { projectId: '9qg5x7wu', dataset: 'production' },
  // Hosted Studio: https://rhmmed.sanity.studio (sign-in required; project members only)
  studioHost: 'rhmmed',
  deployment: { appId: 'uet05vyqrkvsm0915ju9r04p', autoUpdates: true },
});
