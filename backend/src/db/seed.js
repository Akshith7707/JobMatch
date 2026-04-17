require('dotenv').config();
const { scrapingAgent } = require('../agents/scrapingAgent');

async function seed() {
  try {
    console.log('Seeding database with real jobs from the web...');
    const result = await scrapingAgent.scrapeAll();
    console.log(`Seed complete: ${result.inserted} jobs loaded`);
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    const pool = require('./pool');
    await pool.end();
  }
}

seed();
