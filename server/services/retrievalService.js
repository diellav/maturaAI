import { loadedKnowledge, SUBJECTS } from './knowledgeService.js';
export { SUBJECTS } from './knowledgeService.js';

export function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export function validateKnowledge(rows) {
  if (!Array.isArray(rows)) throw new Error('Knowledge base must be an array.');
  const ids = new Set();
  for (const row of rows) {
    if (!row || !['id', 'topic', 'title', 'content', 'sourceTitle', 'sourceUrl'].every(
      key => typeof row[key] === 'string' && row[key].trim(),
    )) throw new Error('Each knowledge chunk needs text, an ID, and a real source.');
    if (ids.has(row.id)) throw new Error(`Duplicate knowledge ID: ${row.id}`);
    ids.add(row.id);
    if (!SUBJECTS.includes(row.subject) || typeof row.verified !== 'boolean') {
      throw new Error(`${row.id}: invalid subject or verification flag.`);
    }
    let url;
    try { url = new URL(row.sourceUrl); } catch { throw new Error(`${row.id}: invalid source URL.`); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`${row.id}: use a public HTTPS source URL.`);
    if (row.sourceYear !== null && (!Number.isInteger(row.sourceYear) || row.sourceYear < 1000 || row.sourceYear > new Date().getFullYear())) {
      throw new Error(`${row.id}: use the actual publication year, or null when unknown.`);
    }
    if (row.keywords !== undefined && (!Array.isArray(row.keywords) || row.keywords.some(k => typeof k !== 'string' || !k.trim()))) {
      throw new Error(`${row.id}: keywords must be nonempty strings.`);
    }
    if (row.verified && (!row.reviewedAt || !row.reviewNote)) {
      throw new Error(`${row.id}: verified chunks need reviewedAt and reviewNote.`);
    }
    if (row.translations !== undefined && (!row.translations || Array.isArray(row.translations) || typeof row.translations !== 'object' || Object.entries(row.translations).some(([key, value]) => !['en', 'de'].includes(key) || typeof value !== 'string' || !value.trim()))) {
      throw new Error(`${row.id}: translations must be nonempty en/de strings.`);
    }
  }
  return rows;
}

export const knowledgeBase = loadedKnowledge.chunks;

// Canonical spellings affect matching only; original student wording is preserved.
export function normalizeQuery(value) {
  const aliases = { qka: 'cka', qa: 'cka', osht: 'eshte', asht: 'eshte', oshte: 'eshte', jon: 'jane', jan: 'jane', jone: 'jane', shpjegoma: 'shpjego' };
  return normalize(value.normalize('NFKC')).split(' ').map(t => aliases[t] || t).join(' ');
}
const stopwords = new Set(normalize(`a an the is are was were be has have do does did what how when why which who explain please tell me about can you use and or of in on for to with between only
  cka cfare eshte jane si kur ku kush pse cili cila cilat cilen ta me ma na nje te e i o u nga per ne dhe apo ose kete kjo ky shpjego shpjegoni shpjegim perdoret zgjidhet dallimi mes edhe vetem ju lutem kam kohe jep pergjigjen ndertohet perbehet ishin sipas material materiali renditen trego tregom dmth funksionon funksionojne rendesishme rendesishem thuaj mundesh pak thjesht lutna tregoma
  was ist sind wie wann warum der die das ein eine und oder von im in mit bitte erklare erklart`).split(' '));
const subjectWords = new Set(normalize(SUBJECTS.join(' ') + ' mathematics math biology english german chemistry history geography ict albanian language').split(' '));
// Explicit families avoid stripping arbitrary short words or technical terms.
const families = [
  ['formule','formula','formulen','formules'],
  ['ide','ideja','idene','idese'],
  ['lidh','lidhet','lidhja'],
  ['analize','analiza','analizoj','analizuar'],
  ['fotosintez','fotosinteza','fotosintezen','fotosinteze','fotosintezes','photosynthesis','photosynthese','fotosynthese'],
  ['funksion','funksioni','funksionin','funksionit','funksione','funksionet','funksioneve'],
  ['enzim','enzima','enzime','enzimat','enzimave','enzimes'],
  ['acid','acidi','acide','acidet','acideve','acidit'],
  ['baze','baza','bazat','bazave','bazes'],
  ['kuadratik','kuadratike','kuadratiket','quadratic','quadratisch'],
  ['diskriminant','diskriminanti','diskriminantin','discriminant','diskriminante'],
  ['klorofil','klorofili','klorofilin','chlorophyll'],
  ['kloroplast','kloroplastet','kloroplaste','chloroplast'],
  ['kujtes','kujtese','kujtesa','kujtesen','kujteses','memory','speicher','arbeitsspeicher'],
  ['arrhenius','arrheniusit','arrenius','arreniusit'],
];
const stems = new Map(families.flatMap(f => f.map(t => [t, f[0]])));
export function stem(token) {
  if (stems.has(token)) return stems.get(token);
  // Only long terms; never trim RAM, ROM, pH, acid, baza or short common words.
  return token.length >= 8 ? token.replace(/(?:ave|eve|it|in|en|es|et)$/, '') : token;
}
export function queryTerms(text, { includeSubject = true } = {}) {
  return [...new Set(normalizeQuery(text).split(' ').filter(t => t.length > 1 && !stopwords.has(t) && (includeSubject || !subjectWords.has(t))))];
}
export function detectIntent(question) {
  const q = normalizeQuery(question);
  if (/\b(dallimi|dallon|ndryshimi|difference|unterschied)\b/.test(q)) return 'comparison';
  if (/\b(si funksionon|si funksionojne|how does|how do)\b/.test(q)) return 'process';
  if (/\b(pse|why|warum)\b/.test(q)) return 'reason';
  if (/\b(cka|cfare|what is|was ist)\b/.test(q)) return 'definition';
  return 'explanation';
}
// One insertion/deletion/substitution or adjacent transposition, long tokens only.
function oneEdit(a, b) {
  if (Math.min(a.length,b.length) < 7 || Math.abs(a.length-b.length) > 1 || a[0] !== b[0]) return false;
  if (a.length === b.length) {
    const diffs = [...a].map((c,i) => c === b[i] ? -1 : i).filter(i => i >= 0);
    return diffs.length === 1 || (diffs.length === 2 && diffs[1] === diffs[0]+1 && a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]]);
  }
  const [small,large] = a.length < b.length ? [a,b] : [b,a];
  let i=0; while (i < small.length && small[i] === large[i]) i++;
  return small.slice(i) === large.slice(i+1);
}
function matchQuality(token, words, fuzzy = false) {
  if (words.includes(token)) return 1;
  const canonical = stem(token);
  if (words.some(w => stem(w) === canonical)) return 0.9;
  if (fuzzy && words.some(w => oneEdit(token,w) || oneEdit(canonical,stem(w)))) return 0.55;
  return 0;
}
/** Keep up to four relevant chunks; authority cannot create relevance. */
export function retrieveContext(question, { subject, verifiedOnly = true, knowledge = knowledgeBase } = {}) {
  const query = queryTerms(question, { includeSubject: false });
  if (!query.length) return { chunks: [], confidence: 'low' };
  const allTerms = queryTerms(question);
  const candidates = knowledge.filter(c => (!verifiedOnly || c.verified === true) && (!subject || c.subject === subject)).map(chunk => {
    const headings = queryTerms(`${chunk.title} ${chunk.topic} ${chunk.subtopic || ''}`, { includeSubject: false });
    const keywords = queryTerms([...(chunk.keywords || []), ...(chunk.aliases || [])].join(' '), { includeSubject: false });
    const body = queryTerms(`${chunk.content} ${Object.values(chunk.translations || {}).join(' ')}`, { includeSubject: false });
    const matches = query.map(t => {
      const h=matchQuality(t,headings), k=matchQuality(t,keywords), b=matchQuality(t,body);
      const fuzzy = h || k || b ? 0 : matchQuality(t,[...headings,...keywords],true);
      return { score: h*4+k*3+b+(fuzzy ? fuzzy*2 : 0), matched: Boolean(h||k||b||fuzzy), strong: Boolean(h||k||fuzzy), fuzzy: Boolean(fuzzy) };
    });
    const coverage = matches.filter(m => m.matched).length / query.length;
    const phrase = query.map(stem).join(' ');
    const exactPhrase = [chunk.title,chunk.topic,chunk.subtopic,...(chunk.keywords||[]),...(chunk.aliases||[])].filter(Boolean).some(v => queryTerms(v,{includeSubject:false}).map(stem).join(' ') === phrase);
    const score = matches.reduce((n,m)=>n+m.score,0) + (exactPhrase ? 2 : 0);
    const authority = { 'official-kosovo-matura':0.45, 'official-kosovo-curriculum':0.4, 'kosovo-educational-material':0.35, 'official-kosovo-matura-historical':0.2, 'trusted-external-reference':0.1 };
    const subjectHint = queryTerms(chunk.subject).some(t => allTerms.includes(t)) ? 0.5 : 0;
    return { chunk,score,rank:score+(authority[chunk.sourceType]||0)+subjectHint,coverage,strong:matches.some(m=>m.strong),fuzzy:matches.some(m=>m.fuzzy) };
  }).filter(r=>r.strong && r.coverage>=0.66 && r.score>=1).sort((a,b)=>b.rank-a.rank || a.chunk.id.localeCompare(b.chunk.id));
  if (!candidates.length) return { chunks: [], confidence:'low' };
  const best=candidates[0];
  return { chunks:candidates.filter(r=>r.score>=best.score*0.5).slice(0,4).map(r=>r.chunk), confidence:best.coverage>=0.85 && best.chunk.verified && !best.fuzzy ? 'high':'medium' };
}

export function isOutOfScope(question) {
  const text = normalize(question);
  return /\b(nba|nfl|premier league|champions league|lottery|lotari|betting|baste|horoscope|horoskop|celebrity|kardashian|weather today|moti sot|buy bitcoin|dating advice)\b/.test(text);
}

export function detectLanguage(question) {
  const text = normalizeQuery(question);
  if (/\b(cka|cfare|eshte|jane|shpjego|perdoret|zgjidhet|cili|dallimi|fotosinteza|kur|kush|me ndihmo)\b/.test(text)) return 'sq';
  if (/\b(was|wie|wann|warum|erklare|unterschied|fotosynthese|photosynthese|verwendet)\b/.test(text)) return 'de';
  if (/\b(what|how|when|why|explain|who|which|is|are|the)\b/.test(text)) return 'en';
  return 'sq';
}



