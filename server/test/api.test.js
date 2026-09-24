import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { answerQuestion as liveAnswerQuestion } from '../services/tutorService.js';
import { knowledgeBase as liveKnowledgeBase, retrieveContext, validateKnowledge, isOutOfScope, detectLanguage } from '../services/retrievalService.js';

// Preserve the original four-reference regression suite as a fixed migration fixture.
const legacyIds = ['bio_photosynthesis', 'en_present_perfect', 'math_quadratic', 'ict_memory'];
const knowledgeBase = legacyIds.map(id => liveKnowledgeBase.find(c => c.id === id));
const answerQuestion = (input, options = {}) => liveAnswerQuestion(input, { retrieve: (q, opts) => retrieveContext(q, { ...opts, knowledge: knowledgeBase }), ...options });
const localOnly = { configured: () => false };
const ask = input => answerQuestion(input, localOnly);

for (const [question, subject, id] of [
  ['Çka është fotosinteza?', 'Biologji', 'bio_photosynthesis'],
  ['Ma shpjego fotosintezën', 'Biologji', 'bio_photosynthesis'],
  ['Kur përdoret Present Perfect?', 'Anglisht', 'en_present_perfect'],
  ['Si zgjidhet një ekuacion kuadratik?', 'Matematikë', 'math_quadratic'],
  ['Cili është dallimi mes RAM dhe ROM?', 'TIK', 'ict_memory'],
  ['What is photosynthesis?', 'Biologji', 'bio_photosynthesis'],
  ['Was ist Fotosynthese?', 'Biologji', 'bio_photosynthesis'],
]) {
  test(`retrieves the correct subject: ${question}`, async () => {
    const result = await ask({ question, verifiedOnly: true });
    assert.equal(result.subject, subject);
    assert.equal(result.status, 'answered');
    assert.equal(result.mode, 'reference');
    assert.equal(result.confidence, 'high');
    assert.equal(result.sources[0].id, id);
    assert.ok(result.sources[0].url.startsWith('https://'));
  });
}

test('unsupported topic never calls the model or fabricates sources', async () => {
  const result = await answerQuestion({ question: 'Ma shpjego mitozën', subject: 'Biologji' }, {
    configured: () => true, generate: () => { throw new Error('Must not be called'); },
  });
  assert.equal(result.status, 'insufficient');
  assert.equal(result.confidence, 'low');
  assert.deepEqual(result.sources, []);
  assert.match(result.answer, /Nuk gjeta material/);
});

test('NBA question is out of scope even when a supported subject is selected', async () => {
  const result = await ask({ question: 'Who won the NBA finals?', subject: 'Histori' });
  assert.equal(result.status, 'out_of_scope');
  assert.deepEqual(result.sources, []);
  assert.equal(isOutOfScope('Who won the Second World War?'), false);
});

test('subject is a strict filter and cannot manufacture relevance', () => {
  assert.deepEqual(retrieveContext('Çka është fotosinteza?', { subject: 'Histori' }).chunks, []);
  assert.deepEqual(retrieveContext('Biologji'), { chunks: [], confidence: 'low' });
  assert.deepEqual(retrieveContext('Explain quantum gravity and photosynthesis').chunks, []);
});

test('verified-only defaults on and excludes unreviewed chunks', async () => {
  const unreviewed = [{ ...knowledgeBase[0], verified: false }];
  assert.equal(retrieveContext('fotosinteza', { knowledge: unreviewed }).chunks.length, 0);
  assert.equal(retrieveContext('fotosinteza', { knowledge: unreviewed, verifiedOnly: false }).chunks.length, 1);
  const result = await answerQuestion({ question: 'fotosinteza', verifiedOnly: false }, {
    ...localOnly, retrieve: (q, options) => retrieveContext(q, { ...options, knowledge: unreviewed }),
  });
  assert.equal(result.confidence, 'low');
  assert.equal(result.sources[0].verified, false);
});

test('turning verified-only off still cannot invoke general model knowledge', async () => {
  const result = await answerQuestion({ question: 'Explain plate tectonics', verifiedOnly: false }, {
    configured: () => true, generate: () => assert.fail('No context must mean no model call'),
  });
  assert.equal(result.status, 'insufficient');
});

test('retrieval caps context and does not duplicate term-count scores', () => {
  const copies = Array.from({ length: 6 }, (_, i) => ({ ...knowledgeBase[0], id: `test_${i}` }));
  assert.equal(retrieveContext('fotosinteza', { knowledge: copies }).chunks.length, 4);
  assert.equal(retrieveContext('fotosinteza fotosinteza').confidence, retrieveContext('fotosinteza').confidence);
});

test('language detection respects the question, not the English topic name', () => {
  assert.equal(detectLanguage('Kur përdoret Present Perfect?'), 'sq');
  assert.equal(detectLanguage('When do I use Present Perfect?'), 'en');
  assert.equal(detectLanguage('Was ist Fotosynthese?'), 'de');
});

test('model receives retrieved context only and sources come from trusted records', async () => {
  const result = await answerQuestion({ question: 'Çka është fotosinteza?' }, {
    configured: () => true,
    generate: async (messages, json) => {
      assert.equal(json, true);
      assert.equal(messages[0].role, 'system');
      const input = JSON.parse(messages[1].content);
      assert.equal(input.context.length, 1);
      assert.equal(input.context[0].id, 'bio_photosynthesis');
      assert.equal(input.language, 'sq');
      return JSON.stringify({ sufficient: true, answer: 'Fotosinteza ruan energjinë e dritës në sheqerna.', usedChunkIds: ['bio_photosynthesis'] });
    },
  });
  assert.equal(result.mode, 'llm');
  assert.equal(result.sources[0].url, knowledgeBase[0].sourceUrl);
});

for (const [label, response] of [
  ['invented citation', { sufficient: true, answer: 'Answer', usedChunkIds: ['invented'] }],
  ['invented URL', { sufficient: true, answer: 'See https://example.invalid', usedChunkIds: ['bio_photosynthesis'] }],
  ['false official attribution', { sufficient: true, answer: 'MASHTI thotë kështu.', usedChunkIds: ['bio_photosynthesis'] }],
  ['empty answer', { sufficient: true, answer: '', usedChunkIds: ['bio_photosynthesis'] }],
]) {
  test(`rejects ${label} and clearly falls back to source notes`, async () => {
    const result = await answerQuestion({ question: 'fotosinteza' }, {
      configured: () => true, generate: async () => JSON.stringify(response),
    });
    assert.equal(result.mode, 'reference');
    assert.equal(result.reason, 'invalid_model_response');
    assert.equal(result.sources[0].id, 'bio_photosynthesis');
  });
}

test('model can refuse an insufficient topical match', async () => {
  const result = await answerQuestion({ question: 'fotosinteza' }, {
    configured: () => true, generate: async () => JSON.stringify({ sufficient: false, answer: '', usedChunkIds: [] }),
  });
  assert.equal(result.status, 'insufficient');
  assert.deepEqual(result.sources, []);
});

test('provider failure is explicit reference mode, never a pretend AI answer', async () => {
  const result = await answerQuestion({ question: 'What is photosynthesis?' }, {
    configured: () => true, generate: async () => { throw new Error('timeout'); },
  });
  assert.equal(result.reason, 'provider_unavailable');
  assert.equal(result.mode, 'reference');
  assert.match(result.answer, /^Photosynthesis/);
});

test('knowledge validation rejects broken provenance and invalid types', () => {
  assert.throws(() => validateKnowledge([{ ...knowledgeBase[0], sourceUrl: 'javascript:alert(1)' }]));
  assert.throws(() => validateKnowledge([{ ...knowledgeBase[0], reviewNote: '' }]));
  assert.throws(() => validateKnowledge([{ ...knowledgeBase[0], sourceYear: '2024' }]));
  assert.throws(() => validateKnowledge([{ ...knowledgeBase[0], verified: 'true' }]));
  assert.throws(() => validateKnowledge([knowledgeBase[0], knowledgeBase[0]]));
  assert.equal(validateKnowledge(knowledgeBase).length, 4);
});

test('HTTP API runs all four demo scenarios and validates inputs', async () => {
  let lastInput;
  const app = createApp({ answer: input => { lastInput = input; return ask(input); } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api`;
  const post = body => fetch(`${url}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    for (const [question, expected] of [
      ['Çka është fotosinteza?', 'answered'],
      ['Kur përdoret Present Perfect?', 'answered'],
      ['Ma shpjego mitozën', 'insufficient'],
      ['Who won the NBA finals?', 'out_of_scope'],
    ]) {
      const response = await post({ question });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).status, expected);
      assert.equal(lastInput.verifiedOnly, true);
    }
    for (const body of [{}, { question: ' ' }, { question: 'a'.repeat(2001) }, { question: 'test', verifiedOnly: 'false' }, { question: 'test', subject: 'Invalid' }, []]) {
      assert.equal((await post(body)).status, 400);
    }
    const malformed = await fetch(`${url}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal((await fetch(`${url}/questions`)).status, 404);
    const status = await (await fetch(`${url}/status`)).json();
    assert.equal(status.subjects.length, 9);
    assert.equal(status.verifiedCount, liveKnowledgeBase.filter(c => c.verified).length);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
