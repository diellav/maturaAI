import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, sep } from 'node:path';
import { loadedKnowledge, loadKnowledge, DATA_ROOT, validateCatalog, statistics } from '../services/knowledgeService.js';
import { knowledgeBase, retrieveContext } from '../services/retrievalService.js';
import { answerQuestion } from '../services/tutorService.js';
import { createApp } from '../app.js';
import { runDemos } from '../scripts/demo.js';
const local = { configured: () => false };
const read = p => JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
function invalidFixture(change, pattern) {
  const directory = mkdtempSync(join(tmpdir(), 'matura-data-test-'));
  try {
    cpSync(join(DATA_ROOT, 'knowledge'), directory, { recursive: true });
    const edit = (name, fn) => { const path = join(directory, name); const data = read(path); fn(data); writeFileSync(path, JSON.stringify(data)); };
    change(edit);
    assert.throws(() => loadKnowledge({ directory }), pattern);
  } finally {
    const rel = relative(resolve(tmpdir()), resolve(directory));
    assert.ok(rel.startsWith('matura-data-test-') && !rel.includes(sep) && !rel.includes('..'));
    rmSync(directory, { recursive: true, force: true });
  }
}
test('manifest loads only real populated subject files and resolves all sourceIds', () => {
  const fresh = loadKnowledge();
  assert.equal(fresh.manifest.subjects.length, 8);
  assert.deepEqual(fresh.chunks, knowledgeBase);
  for (const c of fresh.chunks) assert.ok(fresh.sources.some(s => s.id === c.sourceId));
  assert.equal(fresh.manifest.subjects.some(s => s.name === 'Gjermanisht'), false);
  assert.equal(new Set(fresh.sources.map(s => s.id)).size, fresh.sources.length);
});
test('raw catalog checks all ten hashes, including both unclassified DOCX files', () => {
  const catalog = validateCatalog();
  assert.equal(catalog.sources.length, 10);
  assert.equal(catalog.sources.filter(s => s.originalFile.endsWith('.docx') && s.sourceType === 'unclassified').length, 2);
  const geo = catalog.sources.find(s => s.id === 'unclassified_geo_plan');
  assert.equal(geo.grade, null); assert.equal(geo.year, null); assert.equal(geo.publisher, null);
});
test('source provenance keeps publisher, actual XI grade, historical year and external status', () => {
  const src = id => loadedKnowledge.sources.find(s => s.id === id);
  for (const id of ['albas_bio11','albas_chem11','albas_history11']) {
    assert.equal(src(id).grade, 11); assert.equal(src(id).sourceType, 'kosovo-educational-material');
  }
  assert.equal(src('pegi_math12').grade, 12);
  assert.equal(src('kosovo_matura2014').year, 2014);
  assert.equal(src('kosovo_matura2014').sourceType, 'official-kosovo-matura-historical');
  assert.equal(src('kosovo_core2016').sourceType, 'official-kosovo-curriculum');
  for (const s of loadedKnowledge.sources.filter(s => s.id.startsWith('reference_'))) {
    assert.equal(s.sourceType, 'trusted-external-reference'); assert.equal(s.kosovoSpecific, false);
  }
  assert.equal(statistics(knowledgeBase).bySourceType['official-kosovo-matura'], 0);
});
for (const [name, change, pattern] of [
  ['missing file', edit => edit('manifest.json', d => d.subjects[0].file = 'missing.json'), /ENOENT/],
  ['invalid subject', edit => edit('manifest.json', d => d.subjects[0].name = 'Invented'), /subject/],
  ['file traversal', edit => edit('manifest.json', d => d.subjects[0].file = '../maturaKnowledge.json'), /file/],
  ['duplicate global chunk ID', edit => edit('tik.json', d => d.chunks[0].id = 'math_function'), /Duplicate chunk ID/],
  ['duplicate content', edit => edit('matematike.json', d => d.chunks[1].content = d.chunks[0].content), /Duplicate chunk content/],
  ['conflicting global source ID', edit => edit('tik.json', d => d.sources.find(s => s.id === 'kosovo_core2016').title = 'Conflicting'), /conflicting global source ID/],
  ['unresolved sourceId', edit => edit('tik.json', d => d.chunks[0].sourceId = 'missing'), /unresolved sourceId/],
  ['empty content', edit => edit('tik.json', d => d.chunks[0].content = ' '), /empty chunk field/],
  ['invalid sourceType', edit => edit('tik.json', d => d.sources[0].sourceType = 'official-kosovo'), /invalid sourceType/],
  ['external as official', edit => edit('tik.json', d => d.sources[0].sourceType = 'official-kosovo-matura'), /external publisher falsely/],
  ['Pegi as official', edit => edit('matematike.json', d => d.sources.find(s => s.id === 'pegi_math12').sourceType = 'official-kosovo-matura'), /not a government/],
  ['invalid year', edit => edit('tik.json', d => d.sources[0].year = '2024'), /invalid year/],
  ['invalid page', edit => edit('matematike.json', d => d.chunks[1].sourcePage = -1), /invalid page/],
  ['out of range page', edit => edit('matematike.json', d => d.chunks[1].sourcePage = 50000), /invalid page/],
  ['invalid verified', edit => edit('tik.json', d => d.chunks[0].verified = 'true'), /invalid boolean/],
  ['missing review', edit => edit('tik.json', d => d.chunks[0].reviewNote = ''), /verified provenance/],
]) test(`data validation rejects ${name}`, () => invalidFixture(change, pattern));
test('retrieval combines curriculum, Kosovo explanation and external backup with relevance first', () => {
  const r = retrieveContext('Ma shpjego fotosintezën');
  assert.equal(r.confidence, 'high');
  assert.deepEqual(new Set(r.chunks.map(c => c.sourceType)), new Set(['official-kosovo-curriculum','kosovo-educational-material','trusted-external-reference']));
  const explanations = r.chunks.filter(c => c.evidenceRole === 'explanation');
  assert.equal(explanations[0].sourceType, 'kosovo-educational-material');
  assert.ok(r.chunks.length >= 3 && r.chunks.length <= 5);
  const irrelevantOfficial = { ...knowledgeBase.find(c => c.id === 'history_locke'), sourceType: 'official-kosovo-matura' };
  const external = knowledgeBase.find(c => c.id === 'ict_memory');
  assert.deepEqual(retrieveContext('RAM ROM', { knowledge: [irrelevantOfficial, external] }).chunks.map(c => c.id), ['ict_memory']);
});
test('strict subject filter and verified-only remain effective across subject files', () => {
  assert.equal(retrieveContext('enzimat', { subject: 'Matematikë' }).chunks.length, 0);
  const c = { ...knowledgeBase.find(c => c.id === 'bio_enzymes'), verified: false };
  assert.equal(retrieveContext('enzimat', { knowledge: [c] }).chunks.length, 0);
  assert.equal(retrieveContext('enzimat', { knowledge: [c], verifiedOnly: false }).chunks.length, 1);
});
test('scope-only evidence cannot answer definitions or geographic facts', async () => {
  for (const question of ['Çka është metafora?', 'Cilat janë veçoritë gjeografike të Kosovës?']) {
    const r = await answerQuestion({ question }, { configured: () => true, generate: () => assert.fail('No explanatory context') });
    assert.equal(r.status, 'insufficient'); assert.deepEqual(r.sources, []);
  }
  const r = await answerQuestion({ question: 'Cilat tema për Kosovën përfshiheshin në orientimin e Maturës 2014?' }, local);
  assert.equal(r.status, 'answered'); assert.equal(r.sources[0].year, 2014); assert.match(r.answer, /historike/);
});
test('LLM receives multiple source roles and returns only actual cited provenance', async () => {
  const r = await answerQuestion({ question: 'Ma shpjego fotosintezën' }, { configured: () => true, generate: async messages => {
    const input = JSON.parse(messages[1].content);
    assert.equal(input.context.length, 3);
    assert.equal(input.context.find(c => c.id === 'bio_photosynthesis_kosovo').grade, 11);
    assert.equal(input.context.find(c => c.id === 'bio_photosynthesis_scope').evidenceRole, 'curriculum-scope');
    return JSON.stringify({ sufficient: true, answer: 'Bimët përdorin energjinë e dritës për të krijuar ushqim. Fotosinteza përfshihet si temë në kurrikulën 2016.', usedChunkIds: ['bio_photosynthesis_kosovo','bio_photosynthesis_scope'] });
  } });
  assert.equal(r.mode, 'llm'); assert.equal(r.sources.length, 2);
  assert.deepEqual(new Set(r.sources.map(s => s.page)), new Set([54,61]));
  assert.ok(r.sources.every(s => s.url === null && s.localFileUrl.startsWith('/api/sources/')));
});
test('scope citations alone and false private-publisher official claims are rejected', async () => {
  for (const payload of [
    { answer: 'Fotosinteza krijon ushqim.', usedChunkIds: ['bio_photosynthesis_scope'] },
    { answer: 'Albas është burim zyrtar i Maturës.', usedChunkIds: ['bio_photosynthesis_kosovo','bio_photosynthesis_scope'] },
  ]) {
    const r = await answerQuestion({ question: 'fotosinteza' }, { configured: () => true, generate: async () => JSON.stringify({ sufficient: true, ...payload }) });
    assert.equal(r.reason, 'invalid_model_response'); assert.equal(r.mode, 'reference');
  }
});
test('concise follow-up re-retrieves prior question and preserves both sides of RAM/ROM comparison', async () => {
  const r = await answerQuestion({ question: "Më jep vetëm përgjigjen, s'kam kohë!", previousQuestion: 'Cili është dallimi mes RAM dhe ROM?' }, local);
  assert.equal(r.status, 'answered'); assert.equal(r.concise, true); assert.match(r.answer, /RAM/); assert.match(r.answer, /ROM/);
  assert.ok(r.answer.length < 220); assert.equal(r.sources[0].id, 'ict_memory');
  const math = await answerQuestion({ question: "Si zgjidhet një ekuacion kuadratik? Më jep vetëm përgjigjen, s'kam kohë!" }, local);
  assert.equal(math.status, 'answered'); assert.match(math.answer, /√/);
});
test('concise mode informs the model and enforces at most two sentences', async () => {
  const r = await answerQuestion({ question: "Më jep vetëm përgjigjen, s'kam kohë!", previousQuestion: 'Çka janë enzimat?' }, { configured: () => true, generate: async messages => {
    const input = JSON.parse(messages[1].content); assert.equal(input.concise, true); assert.equal(input.question, 'Çka janë enzimat?');
    return JSON.stringify({ sufficient: true, answer: 'Enzimat përshpejtojnë reaksionet. Substrati lidhet me qendrën aktive. Amilaza është shembull.', usedChunkIds: ['bio_enzymes'] });
  } });
  assert.equal(r.mode, 'llm'); assert.equal(r.answer, 'Enzimat përshpejtojnë reaksionet. Substrati lidhet me qendrën aktive.');
});
test('concise mode without previous question asks for context, changed filter still applies', async () => {
  const question = "Më jep vetëm përgjigjen, s'kam kohë!";
  assert.equal((await answerQuestion({ question }, local)).status, 'needs_context');
  assert.equal((await answerQuestion({ question, previousQuestion: 'RAM ROM', subject: 'Kimi' }, local)).status, 'insufficient');
  assert.equal((await answerQuestion({ question, previousQuestion: 'Who won the NBA finals?' }, local)).status, 'out_of_scope');
});
test('five supported demos, concise request, NBA and real coverage gaps all run', async () => {
  const results = await runDemos();
  assert.equal(results.length, 9);
  assert.ok(results.slice(0,6).every(r => r.status === 'answered' && r.sources.length > 0));
  assert.equal(results[6].status, 'out_of_scope');
});
test('HTTP delivers actual registered PDFs and rejects invalid follow-up input', async () => {
  const app = createApp({ answer: input => answerQuestion(input, local) });
  const server = app.listen(0,'127.0.0.1'); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const pdf = await fetch(`${base}/sources/pegi_math12/file`);
    assert.equal(pdf.status, 200); assert.match(pdf.headers.get('content-type'), /application\/pdf/);
    const bytes = Buffer.from(await pdf.arrayBuffer()); assert.equal(bytes.subarray(0,4).toString(), '%PDF');
    assert.equal((await fetch(`${base}/sources/unclassified_geo_plan/file`)).status, 404);
    assert.equal((await fetch(`${base}/sources/unknown/file`)).status, 404);
    for (const previousQuestion of [42, 'a'.repeat(2001)]) {
      const response = await fetch(`${base}/ask`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ question:'test', previousQuestion }) });
      assert.equal(response.status,400);
    }
  } finally { await new Promise(r => server.close(r)); }
});
