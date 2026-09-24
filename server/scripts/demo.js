import { answerQuestion } from '../services/tutorService.js';
import { knowledgeBase } from '../services/retrievalService.js';
// Choose from actual curated demo metadata, never hardcode a coverage count.
export async function runDemos() {
  const groups = [['Matematikë'], ['Gjuhë Shqipe'], ['TIK'], ['Histori','Gjeografi'], ['Biologji','Kimi']];
  const results = [];
  for (const subjects of groups) {
    const candidates = knowledgeBase.filter(c => subjects.includes(c.subject) && c.demoQuestion && c.evidenceRole !== 'curriculum-scope');
    let chosen;
    for (const c of candidates) {
      const result = await answerQuestion({ question: c.demoQuestion, subject: c.subject }, { configured: () => false });
      if (result.status === 'answered' && result.sources.some(s => s.id === c.id)) { chosen = { question: c.demoQuestion, ...result }; break; }
    }
    if (!chosen) throw new Error(`No grounded demo found for ${subjects.join('/')}`);
    results.push(chosen);
  }
  for (const input of [
    { question: "Më jep vetëm përgjigjen, s'kam kohë!", previousQuestion: results[0].question, subject: results[0].subject },
    { question: 'Who won the NBA finals?' },
    { question: 'Çka është metafora?' },
    { question: 'Cilat janë veçoritë gjeografike të Kosovës?' },
  ]) results.push({ question: input.question, ...await answerQuestion(input, { configured: () => false }) });
  if (results[5].status !== 'answered' || results[6].status !== 'out_of_scope' || results[7].status !== 'insufficient' || results[8].status !== 'insufficient') throw new Error('Demo guardrail failed');
  return results;
}
if (process.argv[1]?.endsWith('demo.js')) {
  console.log(JSON.stringify({ mode: 'Local curated reference mode; no live LLM call', results: await runDemos() }, null, 2));
}
