import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {questions} from '../services/questionService.js';
import {complete,aiConfigured} from '../services/aiService.js';
// Run with node --env-file-if-exists=server/.env server/scripts/evaluate.js
if(!questions.length || !aiConfigured()) {console.log('Evaluation pending: verified questions and configured LLM are required.');process.exitCode=1;}
else {
 const results=[];
 for(const q of questions){
  try {
   const raw=await complete([{role:'system',content:'Solve the mathematics question. Return JSON with one field answer containing A, B, C, or D.'},{role:'user',content:JSON.stringify({question:q.question,options:q.options})}],true);
   const answer=JSON.parse(raw).answer;
   results.push({id:q.id,predictedAnswer:answer,correctAnswer:q.correct_answer,correct:answer===q.correct_answer});
  } catch(e) {results.push({id:q.id,correct:false,error:e.message});}
 }
 const correctAnswers=results.filter(r=>r.correct).length;
 const report={evaluatedAt:new Date().toISOString(),model:process.env.LLM_MODEL,datasetHash:createHash('sha256').update(readFileSync(new URL('../data/matura_math_2024.json',import.meta.url))).digest('hex'),totalQuestions:results.length,correctAnswers,accuracy:Number((100*correctAnswers/results.length).toFixed(1)),results};
 writeFileSync(new URL('../data/evaluation.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
