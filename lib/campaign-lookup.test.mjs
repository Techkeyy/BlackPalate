import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const repository = readFileSync(new URL('./db/repository.ts', import.meta.url), 'utf8');
const detailRoute = readFileSync(new URL('../app/api/campaigns/[id]/route.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

assert.match(repository, /function mapCampaignRow\(r: any\): Campaign/);
assert.match(repository, /async getCampaignById\(id: string\): Promise<Campaign \| null>/);
assert.match(repository, /WHERE c\.id = \$\{id\}/);
assert.match(repository, /if \(rows\?\.\[0\]\) return mapCampaignRow\(rows\[0\]\)/);
assert.match(repository, /return campaigns\.find\(campaign => campaign\.id === id\) \|\| null/);
assert.match(detailRoute, /export const dynamic = 'force-dynamic'/);
assert.match(detailRoute, /export const revalidate = 0/);
assert.match(detailRoute, /const campaigns = await db\.getCampaigns\(\)/);
assert.match(detailRoute, /'Cache-Control': 'no-store'/);
assert.match(page, /setSelectedTasting\(null\)/);
assert.match(page, /Generate Suggested Draft/);
assert.doesNotMatch(page, /BlackPalate AI|DeepSeek|Generate with AI|Executive Culinary Synthesis|AI Synthesis|AI Assistant/);

console.log('Campaign lookup and public-truth contract tests passed.');
