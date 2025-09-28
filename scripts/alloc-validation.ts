// Quick allocation validation script (manual + auto)
import fetch from 'node-fetch';
import { Representative, NodeFetchOptions } from './types';

async function main() {
  const base = 'http://localhost:3000/api';
  const headers = { 'Content-Type': 'application/json' };
  
  // Node-fetch v3 doesn't directly support credentials in the same way as browser fetch
  const options: NodeFetchOptions = { headers };
  
  const repRes = await fetch(base + '/representatives', options);
  const reps = await repRes.json() as Representative[];
  console.log('Representatives count:', reps.length);
}

main().catch(e => { console.error(e); process.exit(1); });
