import { readFileSync } from 'node:fs';
export const SOURCE = 'Kosovo State Matura 2024 · Form A · Mathematics';
export const LETTERS = ['A','B','C','D'];
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function validateQuestions(rows) {
  if (!Array.isArray(rows)) throw new Error('Dataset must be an array.');
  const ids = new Set();
  for (const q of rows) {
    if (!q || !Number.isInteger(q.id) || q.id < 1 || ids.has(q.id) || q.question_number !== q.id) throw new Error('Invalid or duplicate question ID.');
    ids.add(q.id);
    if (q.country !== 'Kosovo' || q.exam !== 'State Matura' || q.year !== 2024 || q.form !== 'A' || q.subject !== 'Mathematics') throw new Error(`Question ${q.id}: wrong exam metadata.`);
    if (!['question','topic','explanation'].every(k=>nonempty(q[k])) || !LETTERS.every(k=>nonempty(q.options?.[k]) && nonempty(q.common_mistakes?.[k])) || !LETTERS.includes(q.correct_answer) || !['easy','medium','hard'].includes(q.difficulty)) throw new Error(`Question ${q.id}: incomplete content.`);
    if (q.verified !== true || q.source?.name !== 'Kosovo State Matura 2024' || q.source.form !== 'A' || q.source.section !== 'Mathematics' || q.source.year !== 2024 || !Number.isInteger(q.source.page) || q.source.page < 1 || !nonempty(q.source.answer_basis)) throw new Error(`Question ${q.id}: source verification required.`);
  }
  return rows;
}
export const questions = validateQuestions(JSON.parse(readFileSync(new URL('../data/questions/matura_math_2024.json', import.meta.url), 'utf8')));
export function publicQuestion(q) {
  const {correct_answer, explanation, common_mistakes, ...visible} = q;
  return {...visible, sourceLabel:SOURCE, kind:'official'};
}
export function grade(q, selectedAnswer) {
  return {correct:selectedAnswer===q.correct_answer, selectedAnswer, correctAnswer:q.correct_answer, explanation:q.explanation, whyWrong:selectedAnswer===q.correct_answer ? '' : q.common_mistakes[selectedAnswer], topic:q.topic, source:SOURCE};
}
