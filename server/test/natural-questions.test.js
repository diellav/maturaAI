import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../scripts/evaluate-natural.js';
import { knowledgeBase, retrieveContext, normalizeQuery, queryTerms, stem, detectIntent } from '../services/retrievalService.js';
import { answerQuestion } from '../services/tutorService.js';
for(const q of questions) test(`natural question: ${q.question}`,async()=>{
 const found=retrieveContext(q.question);
 assert.ok(found.chunks.some(c=>c.id===q.expectedId),`Expected ${q.expectedId}; got ${found.chunks.map(c=>c.id)}`);
 const answer=await answerQuestion({question:q.question},{configured:()=>false});
 assert.equal(answer.status,'answered');
 assert.ok(answer.sources.some(s=>s.id===q.expectedId),'Reference answer must actually use the expected concept');
 assert.equal(answer.subject,knowledgeBase.find(c=>c.id===q.expectedId).subject);
 assert.equal(answer.verifiedOnly,true);
});
test('normalization preserves concepts and technical short tokens',()=>{
 assert.deepEqual(queryTerms('  QKA O fotosinteza?! '),['fotosinteza']);
 assert.equal(normalizeQuery('ÇKA ËSHTË?'),normalizeQuery('C\u0327KA E\u0308SHTE\u0308?'));
 assert.deepEqual(queryTerms('ma shpjego funksionin në matematikë').map(stem),['funksion','matematike']);
 assert.deepEqual(queryTerms('RAM ROM pH'),['ram','rom','ph']);
 for(const words of [['fotosinteza','fotosintezen','fotosinteze'],['funksion','funksioni','funksionin'],['enzima','enzimat','enzimave'],['acidi','acidet','acideve'],['baza','bazat','bazave']]) assert.equal(new Set(words.map(stem)).size,1);
 assert.ok(queryTerms('A ndodh fotosinteza natën?').includes('naten'));
});
test('intent survives filler removal',()=>{
 assert.equal(detectIntent('qka o fotosinteza?'),'definition');
 assert.equal(detectIntent('si funksionon fotosinteza?'),'process');
 assert.equal(detectIntent('Pse fotosinteza?'),'reason');
 assert.equal(detectIntent('ma shpjego fotosintezën'),'explanation');
 assert.equal(detectIntent('qka osht dallimi mes RAM edhe ROM?'),'comparison');
});
test('fuzzy is weaker than exact, bounded to long terms, and cannot manufacture relevance',()=>{
 const row={...knowledgeBase.find(c=>c.id==='bio_photosynthesis_kosovo'),title:'fotosinteza',topic:'fotosinteza',subtopic:'',content:'fotosinteza',keywords:['fotosinteza']};
 const fuzzy={...row,id:'fuzzy-official',title:'fotosinyteza',topic:'fotosinyteza',content:'fotosinyteza',keywords:['fotosinyteza'],sourceType:'official-kosovo-curriculum'};
 assert.equal(retrieveContext('fotosinteza',{knowledge:[fuzzy,row]}).chunks[0].id,row.id);
 assert.equal(retrieveContext('qka o fotosinyteza?',{knowledge:[row]}).confidence,'medium');
 assert.equal(retrieveContext('fotosXXnteza',{knowledge:[row]}).chunks.length,0);
 const memory={...row,title:'RAM',topic:'RAM',content:'RAM',keywords:['RAM']};
 assert.equal(retrieveContext('RAN',{knowledge:[memory]}).chunks.length,0);
 assert.equal(retrieveContext('NBA',{knowledge:[row]}).chunks.length,0);
});
test('selected subject and verified flag remain strict',()=>{
 assert.equal(retrieveContext('fotosinteza',{subject:'Matematikë'}).chunks.length,0);
 const row={...knowledgeBase.find(c=>c.id==='bio_photosynthesis_kosovo'),verified:false};
 assert.equal(retrieveContext('fotosinteza',{knowledge:[row]}).chunks.length,0);
 assert.equal(retrieveContext('fotosinteza',{knowledge:[row],verifiedOnly:false}).chunks.length,1);
});
