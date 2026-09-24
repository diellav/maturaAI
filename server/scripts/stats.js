import { loadedKnowledge, statistics } from '../services/knowledgeService.js';
const s = statistics(loadedKnowledge.chunks);
console.log('MaturaAI Knowledge Base\n\nTotal chunks: ' + s.total + '\n\nBY SUBJECT');
for (const [name,count] of Object.entries(s.bySubject)) console.log(`${name}: ${count}`);
const labels = { 'official-kosovo-matura': 'Official Kosovo Matura', 'official-kosovo-curriculum': 'Official Kosovo Curriculum', 'kosovo-educational-material': 'Kosovo Educational Material', 'official-kosovo-matura-historical': 'Historical Official Material', 'trusted-external-reference': 'Trusted External Reference', unclassified: 'Unclassified' };
console.log('\nBY SOURCE TYPE');
for (const [type,count] of Object.entries(s.bySourceType)) console.log(`${labels[type]}: ${count}`);
console.log(`\nVerified chunks: ${s.verified}\n\nBY EVIDENCE ROLE`);
for (const [role,count] of Object.entries(s.byEvidenceRole)) console.log(`${role}: ${count}`);
