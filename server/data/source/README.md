# Source document required

Place the original Kosovo MASHTI **Testi i Maturës – Forma A, Qershor 2024** PDF here as `kosovo-matura-2024-form-a.pdf`.

No PDF was supplied with this repository. The official dataset is intentionally empty. Do not substitute Albania's exam. Mathematics starts around question 51; verify section boundaries from the actual PDF.

Transcribe 15–25 reliable questions into `../matura_math_2024.json`. Verify every symbol, option and answer against the document and a reliable answer key or independently checked mathematical solution. Skip questions requiring diagrams until those diagrams are faithfully supported. Have a human verify explanations and option-specific mathematical feedback. These describe possible misconceptions, not observed student behavior.

Use the schema in `../question.schema.json`. Set `verified: true` only after review. `source.page` is the PDF page number and `source.answer_basis` records how the answer was checked. Run `npm run validate:data` from the project root. Do not use placeholder text as actual exam content.
