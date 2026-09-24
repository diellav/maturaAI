import { writeFileSync } from 'node:fs';
import { SUBJECTS } from '../services/retrievalService.js';
const text = { type: 'string', minLength: 1 };
const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'MaturaAI curated knowledge base',
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'subject', 'topic', 'title', 'content', 'sourceTitle', 'sourceUrl', 'sourceYear', 'verified'],
    properties: {
      id: text, subject: { enum: SUBJECTS }, topic: text, title: text, content: text,
      sourceTitle: text, sourceUrl: { type: 'string', format: 'uri', pattern: '^https://' },
      sourceYear: { type: ['integer', 'null'], minimum: 1000 },
      verified: { type: 'boolean' },
      keywords: { type: 'array', items: text },
      sourceType: { enum: ['educational-reference', 'official-kosovo'] },
      reviewedAt: { type: 'string', format: 'date' }, reviewNote: text,
      translations: { type: 'object', properties: { en: text, de: text }, additionalProperties: false },
    },
    allOf: [{ if: { properties: { verified: { const: true } }, required: ['verified'] }, then: { required: ['reviewedAt', 'reviewNote'] } }],
  },
};
writeFileSync(new URL('../data/maturaKnowledge.schema.json', import.meta.url), JSON.stringify(schema, null, 2) + '\n');
