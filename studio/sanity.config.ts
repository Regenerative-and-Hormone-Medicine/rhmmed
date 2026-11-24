import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';

// RHM content (rhmmed.com). Project 9qg5x7wu lives in KHOD's Sanity org until handover to an RHM-owned account.
export default defineConfig({
  name: 'rhm',
  title: 'RHM',
  projectId: '9qg5x7wu',
  dataset: 'production',
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
