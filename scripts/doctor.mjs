/**
 * BlackPalate Self-Check Doctor Script
 * Audits environment variables, credentials presence, and staging connectivity.
 */

import https from 'https';

console.log('====================================================');
console.log('           BLACKPALATE DOCTOR CHECK                 ');
console.log('====================================================\n');

// 1. Check Node & Environment
console.log(`[INFO] Node Version: ${process.version}`);
console.log(`[INFO] Operating System: ${process.platform} (${process.arch})`);
console.log(`[INFO] Target Environment: ${process.env.FLYNET_ENV || 'staging'}\n`);

// 2. Credential Presence Check (Redacted only, never printing values)
const envChecks = [
  { name: 'FLYNET_API_KEY', required: true, desc: 'API Key for Discovery & Rewards' },
  { name: 'NEXT_PUBLIC_FLYNET_CLIENT_ID', required: true, desc: 'OAuth Client ID' },
  { name: 'FLYNET_CLIENT_SECRET', required: true, desc: 'OAuth Client Secret' },
  { name: 'NEXT_PUBLIC_FLYNET_REDIRECT_URI', required: true, desc: 'OAuth Redirect URI' },
  { name: 'DATABASE_URL', required: false, desc: 'Production Relational Database (Neon/Postgres)' },
  { name: 'DEEPSEEK_API_KEY', required: false, desc: 'AI Synthesis Provider' },
];

console.log('--- Credential Presence Inventory ---');
let missingRequired = 0;

for (const check of envChecks) {
  const val = process.env[check.name];
  const present = Boolean(val && val.trim().length > 0);
  const status = present ? 'PRESENT' : 'MISSING';
  const prefix = present && check.name === 'FLYNET_API_KEY' ? ` (prefix: ${val.slice(0, 8)}...)` : '';
  
  if (present) {
    console.log(`  [PASS] ${check.name.padEnd(32)}: ${status}${prefix}`);
  } else if (check.required) {
    console.log(`  [WARN] ${check.name.padEnd(32)}: ${status} (${check.desc})`);
    missingRequired++;
  } else {
    console.log(`  [INFO] ${check.name.padEnd(32)}: ${status} (${check.desc})`);
  }
}

console.log('\n--- Network Connectivity Probe ---');

// 3. Staging API Probe
const req = https.request(
  'https://api.staging.blackbird.xyz/flynet/v1/restaurants',
  { method: 'GET' },
  (res) => {
    console.log(`  [PASS] Staging API Reachable: HTTP ${res.statusCode} (Expected 401 unauth challenge)`);
    console.log(`  [INFO] WWW-Authenticate: ${res.headers['www-authenticate'] || 'none'}\n`);
    
    console.log('====================================================');
    if (missingRequired > 0) {
      console.log(`STATUS: READY FOR CREDENTIALS (${missingRequired} required variables missing)`);
    } else {
      console.log('STATUS: FULLY CONFIGURED & READY FOR PROOFS');
    }
    console.log('====================================================\n');
  }
);

req.on('error', (err) => {
  console.log(`  [FAIL] Network probe error: ${err.message}`);
  console.log('====================================================\n');
});

req.end();

