import { defineConfig } from '@playwright/test';
import { makeTestDatabase } from './tests/fixture.mjs';

const port = 3127;
const baseURL = 'http://127.0.0.1:' + port;
const dbPath = makeTestDatabase();
process.env.PC_E2E_DB = dbPath;

export default defineConfig({
  testDir:'./tests',
  testMatch:'*.spec.ts',
  workers:1,
  use:{baseURL, channel:'msedge', viewport:{width:1440,height:900}, reducedMotion:'reduce'},
  webServer:{
    command:`npm run dev -- --port ${port}`,
    url:baseURL+'/en',
    timeout:75000,
    env:{DEMO_DB_PATH:dbPath, DEMO_MODE:'true', NEXT_TELEMETRY_DISABLED:'1', PC_TEST_BUILD:'1', TRANSLATION_API_KEY:'',LOCAL_TRANSLATION_URL:process.env.PC_QA_ARGOS_URL||''}
  }
});
