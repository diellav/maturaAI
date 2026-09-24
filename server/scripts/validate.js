import { loadedKnowledge, statistics, validateCatalog } from '../services/knowledgeService.js';
import { questions } from '../services/questionService.js';
const catalog = validateCatalog();
console.log(`VALID: ${loadedKnowledge.manifest.subjects.length} subject files, ${loadedKnowledge.sources.length} unique live sources, ${loadedKnowledge.chunks.length} chunks.`);
console.log(`Raw source integrity: ${catalog.sources.length} files checked. Question records kept separate: ${questions.length}.`);
console.log(JSON.stringify(statistics(loadedKnowledge.chunks), null, 2));
