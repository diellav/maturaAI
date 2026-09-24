import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { knowledgeBase, retrieveContext } from '../services/retrievalService.js';
import { answerQuestion } from '../services/tutorService.js';
export const questions = JSON.parse(fs.readFileSync(new URL('../test/fixtures/natural-questions.json', import.meta.url),'utf8'));
export async function evaluateNaturalQuestions() {
 const results=[];
 for (const q of questions) {
  const expected=knowledgeBase.find(c=>c.id===q.expectedId);
  if(!expected) throw new Error(`Missing expected chunk: ${q.expectedId}`);
  const retrieval=retrieveContext(q.question);
  const answer=await answerQuestion({question:q.question},{configured:()=>false});
  results.push({...q,expectedTopic:expected.topic, retrievedTopics:retrieval.chunks.map(c=>({id:c.id,topic:c.topic})),hit:retrieval.chunks.some(c=>c.id===q.expectedId),confidence:retrieval.confidence,status:answer.status,referenceUsesExpected:answer.sources.some(s=>s.id===q.expectedId),subject:answer.subject,sources:answer.sources});
 }
 return {mode:'Deterministic curated reference mode, verifiedOnly=true, no subject filter. Retrieval hits and selected citations are measured; semantic answer correctness is not automatically scored.',questions:results.length,concepts:new Set(results.map(r=>r.concept)).size,hits:results.filter(r=>r.hit).length,expectedReferenceSources:results.filter(r=>r.referenceUsesExpected).length,results};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const report=await evaluateNaturalQuestions();
 fs.writeFileSync('NATURAL_QUESTION_RESULTS.json',JSON.stringify(report,null,2)+'\n');
 const esc=s=>String(s).replaceAll('|','/').replaceAll('\n',' ');
 const rows=report.results.map(r=>`| ${esc(r.question)} | ${esc(r.expectedTopic)} (${r.expectedId}) | ${r.retrievedTopics.map(c=>esc(c.topic)+' ('+c.id+')').join('; ')} | ${r.hit?'YES':'NO'} | ${r.confidence} | ${r.sources.map(s=>esc(s.title)+(s.page?' · PDF p. '+s.page:'')).join('; ')} | ${r.referenceUsesExpected?'YES':'NO'} |`);
 fs.writeFileSync('NATURAL_QUESTION_RESULTS.md',`# Natural question evaluation\n\n${report.mode}\n\n${report.questions} questions, ${report.concepts} distinct concepts; ${report.hits}/${report.questions} retrieval hits; ${report.expectedReferenceSources}/${report.questions} reference answers cite the expected chunk. Variants count once as concept coverage. This is a curated regression set, not a held-out benchmark.\n\n| Question | Expected topic | Retrieved topics (up to 4) | Hit | Confidence | Selected answer source | Expected citation |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
 console.log(JSON.stringify({questions:report.questions,concepts:report.concepts,hits:report.hits,expectedReferenceSources:report.expectedReferenceSources,failures:report.results.filter(r=>!r.hit||!r.referenceUsesExpected)},null,2));
}
