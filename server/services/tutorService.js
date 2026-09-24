import { complete, aiConfigured, SYSTEM } from './aiService.js';
import { retrieveContext, isOutOfScope, detectLanguage, detectIntent, normalize } from './retrievalService.js';
export const INSUFFICIENT = "Nuk gjeta material të mjaftueshëm të verifikuar në bazën time aktuale për t'iu përgjigjur kësaj pyetjeje me siguri.";
export const OUT_OF_SCOPE = 'Kjo pyetje është jashtë fushës së MaturaAI. Mund të të ndihmoj me pyetje që lidhen me përgatitjen për Maturën Shtetërore të Kosovës.';
const insufficientText = { sq: INSUFFICIENT, en: 'I could not find enough verified material in my current knowledge base to answer this question reliably.', de: 'In meiner aktuellen Wissensbasis habe ich nicht genügend überprüftes Material gefunden, um diese Frage zuverlässig zu beantworten.' };
const scopeText = { sq: OUT_OF_SCOPE, en: "This question is outside MaturaAI's scope. I can help with questions related to preparation for Kosovo's State Matura.", de: 'Diese Frage liegt außerhalb des Themenbereichs von MaturaAI. Ich helfe bei Fragen zur Vorbereitung auf die staatliche Matura im Kosovo.' };
export function conciseRequest(question) {
  return /vetem pergjigj|s kam kohe|only (the )?answer|just (the )?answer|nur die antwort/.test(normalize(question));
}
function stripConcise(question) {
  return question.replace(/m[eë]\s+jep\s+vet[eë]m\s+p[eë]rgjigjen[,.!\s]*/ig, '')
    .replace(/s['’]?kam\s+koh[eë][!.\s]*/ig, '')
    .replace(/(?:give me\s+)?(?:only|just) (?:the )?answer[,.!\s]*/ig, '')
    .replace(/(?:gib mir )?nur die antwort[,.!\s]*/ig, '').trim();
}
function isScopeQuestion(q) { return /\b(kurrikul\w*|curriculum|program(?:i|in|it)?|orientues|orientimin|scope|tema|topics)\b/.test(normalize(q)); }
function shorten(text) {
  return text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim();
}
function sourceOf(chunk) {
  return { id: chunk.id, sourceId: chunk.sourceId || chunk.id, title: chunk.sourceTitle, url: chunk.sourceUrl,
    localFileUrl: chunk.originalFile ? `/api/sources/${encodeURIComponent(chunk.sourceId)}/file${chunk.sourcePage ? `#page=${chunk.sourcePage}` : ''}` : null,
    topic: chunk.topic, year: chunk.sourceYear, grade: chunk.grade ?? null, grades: chunk.grades,
    publisher: chunk.publisher ?? null, page: chunk.sourcePage ?? null, locator: chunk.sourceLocator,
    verified: chunk.verified, type: chunk.sourceType, evidenceRole: chunk.evidenceRole || 'explanation' };
}
/** Previous questions are re-retrieved under current filters; client evidence is never trusted. */
export async function answerQuestion({ question, subject, verifiedOnly = true, previousQuestion }, {
  retrieve = retrieveContext, configured = aiConfigured, generate = complete,
} = {}) {
  const concise = conciseRequest(question);
  const stripped = concise ? stripConcise(question) : question;
  const retrievalQuestion = stripped || (concise ? previousQuestion?.trim() : '') || '';
  const language = detectLanguage(question);
  const intent = detectIntent(retrievalQuestion);
  const base = { subject: subject || null, confidence: 'low', sources: [], verifiedOnly, language, intent, concise, retrievalQuestion };
  if (isOutOfScope(question) || isOutOfScope(retrievalQuestion)) return { ...base, answer: scopeText[language], status: 'out_of_scope', mode: 'guardrail' };
  const insufficient = () => ({ ...base, answer: insufficientText[language], status: 'insufficient', mode: 'guardrail' });
  if (!retrievalQuestion) return { ...base, answer: language === 'sq' ? 'Për cilën pyetje? Shkruaje pyetjen dhe do të përgjigjem shkurt.' : language === 'de' ? 'Zu welcher Frage? Bitte schreibe deine Frage.' : 'Which question? Please include it so I can answer briefly.', status: 'needs_context', mode: 'guardrail' };
  const { chunks, confidence } = retrieve(retrievalQuestion, { subject, verifiedOnly });
  if (!chunks.length || confidence === 'low' || (verifiedOnly && chunks.some(c => c.verified !== true))) return insufficient();
  const scopeQuestion = isScopeQuestion(retrievalQuestion);
  const answers = chunks.filter(c => scopeQuestion || c.evidenceRole !== 'curriculum-scope');
  if (!answers.length) return insufficient();
  function referenceNotes(reason) {
    const chunk = answers.find(c => language === 'sq' || c.translations?.[language]) || answers[0];
    const text = (concise && language === 'sq' && chunk.conciseContent) || chunk.translations?.[language] || chunk.content;
    return { ...base, subject: chunk.subject, confidence: chunk.verified ? confidence : 'low', status: 'answered', mode: 'reference', reason,
      answer: concise ? shorten(text) : text, answerLanguage: chunk.translations?.[language] ? language : 'sq', sources: [sourceOf(chunk)] };
  }
  if (!configured()) return referenceNotes('not_configured');
  let result;
  try {
    result = JSON.parse(await generate([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify({ question: retrievalQuestion, request: question, language, intent, concise, verifiedOnly, scopeQuestion,
        context: chunks.map(c => ({ id: c.id, sourceId: c.sourceId, subject: c.subject, topic: c.topic, subtopic: c.subtopic,
          content: c.translations?.[language] || c.content, sourceTitle: c.sourceTitle, sourceType: c.sourceType,
          publisher: c.publisher, grade: c.grade, year: c.sourceYear, page: c.sourcePage, evidenceRole: c.evidenceRole || 'explanation', verified: c.verified })) }) },
    ], true));
  } catch { return referenceNotes('provider_unavailable'); }
  if (result?.sufficient !== true) return insufficient();
  const validIds = new Set(chunks.map(c => c.id));
  const invalidIds = !Array.isArray(result.usedChunkIds) || !result.usedChunkIds.length || result.usedChunkIds.some(id => !validIds.has(id));
  const used = invalidIds ? [] : chunks.filter(c => result.usedChunkIds.includes(c.id));
  const answer = result.answer;
  const officialClaim = typeof answer === 'string' && /\b(MASHTI|official|zyrtar\w*|offiziell\w*)\b/i.test(answer);
  const invalidProvenance = officialClaim && (!scopeQuestion || !used.some(c => c.sourceType?.startsWith('official-kosovo')) || /\b(Pegi|Albas|OpenStax|BBC|British Council)\b/i.test(answer));
  if (invalidIds || typeof answer !== 'string' || !answer.trim() || answer.length > 6000 || /https?:\/\/|www\./i.test(answer) || invalidProvenance || (!scopeQuestion && !used.some(c => c.evidenceRole !== 'curriculum-scope'))) return referenceNotes('invalid_model_response');
  return { ...base, subject: used[0].subject, confidence: used.some(c => !c.verified) ? 'low' : confidence,
    answer: concise ? shorten(answer.trim()) : answer.trim(), sources: used.map(sourceOf), status: 'answered', mode: 'llm', answerLanguage: language };
}
