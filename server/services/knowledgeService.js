import { readFileSync, realpathSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const SUBJECTS = ['Matematikë', 'Gjuhë Shqipe', 'Anglisht', 'Gjermanisht', 'TIK', 'Histori', 'Gjeografi', 'Kimi', 'Biologji'];
export const SOURCE_TYPES = ['official-kosovo-matura', 'official-kosovo-curriculum', 'kosovo-educational-material', 'official-kosovo-matura-historical', 'trusted-external-reference', 'unclassified'];
export const DATA_ROOT = fileURLToPath(new URL('../data/', import.meta.url));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const read = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const fail = (condition, message) => { if (!condition) throw new Error(message); };
export function safeFile(root, name) {
  fail(nonempty(name), 'Missing file path');
  const full = realpathSync(resolve(root, name));
  const rel = relative(realpathSync(root), full);
  fail(rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !resolve(name).includes('\0') && !rel.includes(':') && !rel.startsWith(sep), `File outside data directory: ${name}`);
  return full;
}
function validateSource(s, dataRoot) {
  fail(s && nonempty(s.id) && /^[a-z0-9_]+$/.test(s.id) && nonempty(s.title), 'Invalid source identity');
  fail(SOURCE_TYPES.includes(s.sourceType), `${s.id}: invalid sourceType`);
  fail(s.year === null || (Number.isInteger(s.year) && s.year >= 1000 && s.year <= new Date().getFullYear()), `${s.id}: invalid year`);
  fail(s.grade === null || (Number.isInteger(s.grade) && s.grade >= 1 && s.grade <= 12), `${s.id}: invalid grade`);
  fail(s.publisher === null || nonempty(s.publisher), `${s.id}: invalid publisher`);
  fail(s.pageCount === null || (Number.isInteger(s.pageCount) && s.pageCount > 0), `${s.id}: invalid pageCount`);
  fail(nonempty(s.metadataEvidence), `${s.id}: classification evidence required`);
  fail(typeof s.kosovoSpecific === 'boolean', `${s.id}: Kosovo status required`);
  if (/OpenStax|British Council|\bBBC\b/i.test(`${s.publisher} ${s.title} ${s.url}`)) {
    fail(s.sourceType === 'trusted-external-reference' && !s.kosovoSpecific, `${s.id}: external publisher falsely classified`);
  }
  if (/Pegi|Albas/i.test(`${s.publisher} ${s.title}`)) {
    fail(!s.sourceType.startsWith('official-'), `${s.id}: educational publisher is not a government source`);
  }
  if (s.sourceType.startsWith('official-kosovo')) fail(s.kosovoSpecific && nonempty(s.publisher), `${s.id}: official provenance required`);
  if (s.sourceType === 'official-kosovo-matura-historical') fail(Number.isInteger(s.year), `${s.id}: historical year required`);
  if (s.url !== null) {
    let url; try { url = new URL(s.url); } catch { throw new Error(`${s.id}: invalid URL`); }
    fail(url.protocol === 'https:' && !url.username && !url.password, `${s.id}: public HTTPS URL required`);
  }
  if (s.originalFile !== null) {
    fail(s.originalFile.startsWith('source/') && /\.(pdf|docx|md)$/i.test(s.originalFile), `${s.id}: invalid raw source file`);
    const path = safeFile(dataRoot, s.originalFile);
    fail(/^[a-f0-9]{64}$/.test(s.sha256), `${s.id}: source hash required`);
    fail(createHash('sha256').update(readFileSync(path)).digest('hex') === s.sha256, `${s.id}: raw source changed since review`);
  }
  fail(s.url !== null || s.originalFile !== null, `${s.id}: source needs a real locator`);
}
export function loadKnowledge({ directory = resolve(DATA_ROOT, 'knowledge'), dataRoot = DATA_ROOT } = {}) {
  const manifest = read(resolve(directory, 'manifest.json'));
  fail(manifest.version === 1 && Array.isArray(manifest.subjects) && manifest.subjects.length, 'Invalid manifest');
  const chunks = [], sources = new Map(), ids = new Set(), fingerprints = new Set(), names = new Set(), files = new Set();
  for (const entry of manifest.subjects) {
    fail(SUBJECTS.includes(entry.name) && !names.has(entry.name), 'Invalid or duplicate manifest subject');
    fail(/^[a-z_]+\.json$/.test(entry.file) && !files.has(entry.file), 'Invalid or duplicate manifest file');
    names.add(entry.name); files.add(entry.file);
    const doc = read(safeFile(directory, entry.file));
    fail(doc.subject === entry.name && Array.isArray(doc.sources) && Array.isArray(doc.chunks) && doc.chunks.length > 0, `${entry.file}: invalid subject document`);
    const local = new Map();
    for (const s of doc.sources) {
      fail(!local.has(s.id), `${entry.file}: duplicate source ID`);
      // General curriculum sources can recur in subject files only with identical metadata.
      if (sources.has(s.id)) fail(JSON.stringify(sources.get(s.id)) === JSON.stringify(s), `${s.id}: conflicting global source ID`);
      else { validateSource(s, dataRoot); sources.set(s.id, s); }
      local.set(s.id, s);
    }
    for (const c of doc.chunks) {
      fail(c && ['id','title','topic','subtopic','content','sourceId','sourceLocator'].every(k => nonempty(c[k])), `${entry.file}: empty chunk field`);
      fail(!ids.has(c.id), `Duplicate chunk ID: ${c.id}`); ids.add(c.id);
      const fingerprint = c.content.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
      fail(!fingerprints.has(fingerprint), `Duplicate chunk content: ${c.id}`); fingerprints.add(fingerprint);
      const s = local.get(c.sourceId); fail(s, `${c.id}: unresolved sourceId`);
      fail(typeof c.verified === 'boolean' && typeof c.curriculumRelevant === 'boolean', `${c.id}: invalid boolean`);
      fail(['explanation','curriculum-scope','study-method'].includes(c.evidenceRole), `${c.id}: invalid evidence role`);
      fail(Array.isArray(c.keywords) && c.keywords.every(nonempty), `${c.id}: invalid keywords`);
      fail(c.sourcePage === null || (Number.isInteger(c.sourcePage) && c.sourcePage > 0 && s.pageCount !== null && c.sourcePage <= s.pageCount), `${c.id}: invalid page`);
      if (s.originalFile?.endsWith('.pdf')) fail(c.sourcePage !== null, `${c.id}: PDF page required`);
      if (s.originalFile?.endsWith('.docx')) fail(c.sourcePage === null, `${c.id}: DOCX page must be null`);
      if (c.verified) fail(nonempty(c.reviewNote) && /^\d{4}-\d{2}-\d{2}$/.test(c.reviewedAt) && s.sourceType !== 'unclassified', `${c.id}: verified provenance required`);
      if (c.translations) fail(Object.entries(c.translations).every(([k,v]) => ['en','de'].includes(k) && nonempty(v)), `${c.id}: invalid translations`);
      chunks.push({ ...c, subject: entry.name, sourceTitle: s.title, sourceUrl: s.url, sourceYear: s.year, sourceType: s.sourceType, publisher: s.publisher, grade: s.grade, grades: s.grades, originalFile: s.originalFile });
    }
  }
  return { manifest, chunks, sources: [...sources.values()] };
}
export function statistics(chunks) {
  return { total: chunks.length, verified: chunks.filter(c => c.verified).length,
    bySubject: Object.fromEntries(SUBJECTS.map(s => [s, chunks.filter(c => c.subject === s).length])),
    bySourceType: Object.fromEntries(SOURCE_TYPES.map(t => [t, chunks.filter(c => c.sourceType === t).length])),
    byEvidenceRole: Object.fromEntries(['explanation','curriculum-scope','study-method'].map(r => [r, chunks.filter(c => c.evidenceRole === r).length])) };
}
export function validateCatalog() {
  const catalog = read(resolve(DATA_ROOT, 'source-catalog.json'));
  const ids = new Set();
  for (const s of catalog.sources) { fail(!ids.has(s.id), 'Duplicate catalog ID'); ids.add(s.id); validateSource(s, DATA_ROOT); }
  return catalog;
}
export const loadedKnowledge = loadKnowledge();
