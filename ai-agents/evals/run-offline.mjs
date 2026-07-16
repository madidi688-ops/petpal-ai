#!/usr/bin/env node
/**
 * PetPal offline prompt evals
 * - Default: score fixtureReply in cases/*.json (CI / 本地无 Key)
 * - Optional: PETPAL_EVAL_REPLIES=path/to/actuals.json 覆盖 actual 字段做真人/真模型评分
 *
 * Exit 0 = all pass; 1 = any fail
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesPath = join(__dirname, 'cases', 'chat-persona.json');
const outDir = join(__dirname, 'out');
const data = JSON.parse(readFileSync(casesPath, 'utf8'));

/** @type {Record<string, string>} */
let overrides = {};
const overridePath = process.env.PETPAL_EVAL_REPLIES;
if (overridePath && existsSync(overridePath)) {
  overrides = JSON.parse(readFileSync(overridePath, 'utf8'));
}

function scoreCase(c) {
  const reply = String(overrides[c.id] ?? c.fixtureReply ?? c.actual ?? '').trim();
  const failures = [];
  if (!reply) {
    failures.push('missing reply (fixtureReply / actual / override)');
    return { id: c.id, pass: false, failures, reply: '' };
  }

  const mustNot = c.expect?.mustNotInclude ?? [];
  for (const bad of mustNot) {
    if (reply.includes(bad)) failures.push(`contains forbidden: 「${bad}」`);
  }

  const mustAny = c.expect?.mustIncludeAny ?? [];
  if (mustAny.length > 0 && !mustAny.some((w) => reply.includes(w))) {
    failures.push(`missing any of: ${mustAny.join(' / ')}`);
  }

  // 粗略长度：过短像敷衍，过长不像宠物聊天
  const len = reply.length;
  if (len < 8) failures.push('too short');
  if (len > 280) failures.push('too long (>280 chars)');

  return { id: c.id, pass: failures.length === 0, failures, reply };
}

const results = data.cases.map(scoreCase);
const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;

console.log(`PetPal prompt evals · ${data.promptVersion}`);
console.log(`mode: ${overridePath ? `live overrides ← ${overridePath}` : 'fixture (offline)'}`);
console.log(`cases: ${results.length} · pass: ${passed} · fail: ${failed}`);
console.log('---');

for (const r of results) {
  const mark = r.pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${r.id}`);
  if (!r.pass) {
    for (const f of r.failures) console.log(`       - ${f}`);
  }
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const report = {
  promptVersion: data.promptVersion,
  mode: overridePath ? 'override' : 'fixture',
  passed,
  failed,
  total: results.length,
  passRate: results.length ? Number((passed / results.length).toFixed(3)) : 0,
  results,
  generatedAt: new Date().toISOString(),
};
writeFileSync(join(outDir, 'latest.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(`\nreport → ai-agents/evals/out/latest.json`);

if (failed > 0) {
  console.error('\nEVAL FAILED');
  process.exit(1);
}
console.log('\nEVAL OK');
process.exit(0);
