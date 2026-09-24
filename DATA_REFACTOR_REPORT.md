# MaturaAI data + RAG refactor report

> Historical initial-refactor snapshot. The later quality pass and current counts are in QUALITY_PASS_REPORT.md (79 chunks, 103 tests).

Completed against the real local repository. No new infrastructure or redesign. The final app loads curated per-subject knowledge through a manifest; originals and legacy snapshots remain intact.

## 1–2. Exact raw inventory and classification

All filenames below are under `server/data/source/`. Classification is supported by the document itself, not inferred from filenames or language.

| Exact raw file | Document / publisher | Grade / year | Subject(s) | Classification |
|---|---|---|---|---|
| `matematika-12.pdf` | Libër për mësuesin · Matematika 12 / Botime Pegi, dega në Kosovë | 12 / 2022 | Matematikë | `kosovo-educational-material` |
| `gjuha-shqipe-dhe-letersia-12.pdf` | Libër për mësuesin · Gjuha shqipe dhe letërsia 12 / Botime Pegi, dega në Kosovë | 12 / 2022 | Gjuhë Shqipe | `kosovo-educational-material` |
| `liber-mesuesi-biologji-11-ks.pdf` | Libër për mësuesin · Biologji 11 / Albas | 11 / 2019 | Biologji | `kosovo-educational-material` |
| `liber-mesuesi-histori-11-ks.pdf` | Libër për mësuesin · Histori 11 / Albas | 11 / 2019 | Histori | `kosovo-educational-material` |
| `liber-mesuesi-kimi-11-ks.pdf` | Libër për mësuesin · Kimi 11 / Albas | 11 / 2019 | Kimi | `kosovo-educational-material` |
| `korniza-berthame-3-final.pdf` | Kurrikula Bërthamë për arsimin e mesëm të lartë të Kosovës · e rishikuar / Ministria e Arsimit, Shkencës dhe Teknologjisë | X–XII / 2016 | Matematikë, Gjuhë Shqipe, Anglisht, TIK, Histori, Gjeografi, Kimi, Biologji | `official-kosovo-curriculum` |
| `programi-orientues-dhe-modele-te-pyetje-per-provimin-e-matures-shteteror_1.pdf` | Programi orientues dhe modele të pyetjeve · Matura 2014 / MASHT · Divizioni për Vlerësim, Standarde dhe Monitorim | unknown / 2014 | Matematikë, Gjuhë Shqipe, Anglisht, TIK, Histori, Gjeografi, Kimi, Biologji | `official-kosovo-matura-historical` |
| `Gjeografi-12-Plani-vjetor-2022-2023-9gubwj.docx` | Plani vjetor · Gjeografi / unknown | unknown / unknown | Gjeografi | `unclassified` |
| `tik-12-natyror-ks-plan-ctq7ik.docx` | Plani vjetor · TIK / unknown | 12 / unknown | TIK | `unclassified` |
| `README.md` | Raw-source repository instructions / unknown | unknown / unknown | not academic | `unclassified` |

Metadata evidence and uncertainty:

- **pegi_math12**: Title and Kosovo branch copyright, PDF pp. 2–3. Approval fields contain placeholders; no government authorship claimed.
- **pegi_albanian12**: Cover and lesson headings say XII; p. 2 has a conflicting class-5 template line. Grade follows title and actual lessons (e.g. p. 130). Copyright Kosovo branch p. 3; approval placeholders do not establish official status.
- **albas_bio11**: Title p. 2; Albas copyright 2019 and Kosovo ministry school-use decision dated 09.07.2019 p. 3. Approval does not make Albas a government publisher.
- **albas_history11**: Title p. 2; Albas copyright 2019 and Kosovo ministry school-use decision dated 09.07.2019 p. 3. Approval does not make Albas a government publisher.
- **albas_chem11**: Title p. 2; Albas copyright 2019 and Kosovo ministry school-use decision dated 09.07.2019 p. 3. Approval does not make Albas a government publisher.
- **kosovo_core2016**: Republic of Kosovo/MASHT, revised August 2016, gymnasium classes X, XI, XII on cover. Scope evidence, not current exam guarantee.
- **kosovo_matura2014**: Cover explicitly says Matura 2014, Prishtinë 2014. Historical scope only; multiple-choice questions are excluded from conceptual chunks.
- **unclassified_geo_plan**: Paragraphs identify Geography but conflict: filename suggests XII; repeated internal headings say XI (e.g. Paragraph 8). Publisher and publication year not established; filename year not treated as publication evidence. Not promoted.
- **unclassified_tik_plan**: Tables 2–5 row 5 identify class XII. No explicit publisher, date or Kosovo institution found. Filename ks is not proof of provenance. Not promoted.
- **source_readme**: Repository instructions, not academic source material. Preserved unchanged.

The four preserved external references are OpenStax Biology 2e §8.1 (2018), OpenStax Elementary Algebra 2e §10.3 (2020), British Council Present Perfect (year unknown), and BBC Bitesize memory transcript (year unknown). All are `trusted-external-reference`; their existing URLs, content, translations and original review notes were retained. Their legacy reviews were migrated, not represented as newly downloaded local documents.

## 3. Parsing results

Seven PDFs and two DOCX files extracted successfully. **No document failed parsing; no OCR was used.** The README was inspected as repository instructions and not ingested. Full extraction is staging data, not a claim that every page is reliable or every extracted candidate is live knowledge.

PDF pages use physical 1-based numbering. DOCX text retains paragraph/table-row locators and null pages. Repeated headers/footers and duplicate candidate text are filtered. Both DOCX plans remain unclassified and are excluded from verified live chunks. Mathematical glyph corruption and apparent errors were found; only reviewed short explanations were promoted. The erroneous ionic equation on Kimi PDF p. 34 and questionable historical etymology on Histori p. 84 were not ingested. Rendered pages 82 (math), 130 (Albanian), 54 (biology) and 34 (chemistry) were visually checked.

## 4. Exact application files created (19)

- `DATA_REFACTOR_REPORT.md`
- `server/data/knowledge/anglisht.json`
- `server/data/knowledge/biologji.json`
- `server/data/knowledge/gjeografi.json`
- `server/data/knowledge/gjuhe_shqipe.json`
- `server/data/knowledge/histori.json`
- `server/data/knowledge/kimi.json`
- `server/data/knowledge/manifest.json`
- `server/data/knowledge/matematike.json`
- `server/data/knowledge/tik.json`
- `server/data/questions/matura_math_2024.json`
- `server/data/questions/question.schema.json`
- `server/data/source-catalog.json`
- `server/scripts/demo.js`
- `server/scripts/ingest.js`
- `server/scripts/ingest.py`
- `server/scripts/stats.js`
- `server/services/knowledgeService.js`
- `server/test/knowledge.test.js`

## 5. Exact application files modified (13)

- `.gitignore`
- `README.md`
- `client/src/main.jsx`
- `client/src/style.css`
- `package.json`
- `server/app.js`
- `server/routes/ask.js`
- `server/scripts/validate.js`
- `server/services/aiService.js`
- `server/services/questionService.js`
- `server/services/retrievalService.js`
- `server/services/tutorService.js`
- `server/test/api.test.js`

No original file was deleted. All ten raw-file hashes match the pre-refactor baseline. The four-reference legacy JSON/schema and original question JSON/schema are preserved; question files are copied into the new questions directory, and the dormant question service reads that directory. `matura_math_2024.json` contains zero records and was never treated as conceptual knowledge.

Generated build output (`client/dist/`), ignored extraction/scratch (`tmp/`), and ignored future-ingestion output (`server/data/ingestion/`) are working artifacts, separate from the application-file inventory above. No lockfile or dependency change was needed for this refactor.

## 6–8. Real knowledge statistics

**23 chunks**, all 23 reviewed/verified, across 8 populated subject files and 11 unique live sources.

| Subject | Chunks |
|---|---:|
| Matematikë | 6 |
| Gjuhë Shqipe | 3 |
| Anglisht | 1 |
| TIK | 2 |
| Histori | 2 |
| Gjeografi | 1 |
| Kimi | 3 |
| Biologji | 5 |
| Gjermanisht | 0 |

| Source type | Chunks |
|---|---:|
| `official-kosovo-matura` | 0 |
| `official-kosovo-curriculum` | 4 |
| `kosovo-educational-material` | 13 |
| `official-kosovo-matura-historical` | 2 |
| `trusted-external-reference` | 4 |
| `unclassified` | 0 |

Evidence roles: 15 explanation chunks, 1 study-method chunk, 7 scope chunks. Counts are calculated from files; scope counts must not be pitched as full explanations.

## 9. Kosovo-specific coverage

The strongest small concept selections are Mathematics (functions and arithmetic progression), Biology (photosynthesis/energy, green leaves, enzymes), and Chemistry (Arrhenius and Brønsted–Lowry). Albanian has a concrete five-line writing exercise, register listing and limited metaphor scope. History has two short explanations about Locke and Rousseau. These are curated examples, **not comprehensive coverage of any subject**. Geography has historical topic scope only, not an explanation of Kosovo’s physical/human geography.

## 10. External backup dependence

TIK depends on BBC for the RAM/ROM explanation; the curriculum provides only broader computer-device scope. English currently has only the British Council Present Perfect reference. Quadratic solving uses OpenStax with separate Kosovo curriculum and historical scope. Biology retains OpenStax as a fuller backup, including existing English/German translations. There is no populated German-language subject file and no German-subject coverage claim.

## 11–13. Verification results

- `npm run validate:data`: PASS — 8 subject files, 11 unique live sources, 23 chunks; all 10 raw hashes checked; 0 question records kept separately.
- `npm test`: PASS — 52/52 tests, including all original 23 regression cases. The original cases use the four migrated references as a stable fixture; new tests exercise the expanded live dataset.
- `npm run build`: PASS — Vite production build, 23 modules transformed.
- `npm run stats:data`: PASS — numbers shown above are calculated from manifest files.
- `npm run ingest:data`: PASS — empty inbox produces an empty staging report; the Python extractor separately processed all nine actual PDF/DOCX sources successfully.
- `npm run demo:data`: PASS — five supported subject groups, concise follow-up, NBA refusal and two real coverage gaps.
- Browser check: Albanian answer and concise follow-up succeeded; source card showed PEGI, 2022, grade XII, PDF page 130, correct provenance badge and a real local PDF link; verified-only stayed ON. Desktop layout visually checked.
- HTTP integration test: registered math PDF returned actual `%PDF` bytes; unknown/unclassified source IDs returned 404; invalid previous-question inputs returned 400.

No live LLM provider is configured. Provider behavior is covered by injected model-response tests, not a successful paid/live generation claim. Current browser demo runs clearly labelled curated reference mode.

## 14. Five supported live-demo questions

Chosen automatically from actual curated chunk metadata by `npm run demo:data`, then checked to return the intended chunk.

| Subject | Question | Actual evidence | Result |
|---|---|---|---|
| Matematikë | Çka është një funksion? | Libër për mësuesin · Matematika 12, PDF p. 39 | answered / reference / high |
| Gjuhë Shqipe | Si ndërtohet një pesëvargësh? | Libër për mësuesin · Gjuha shqipe dhe letërsia 12, PDF p. 130 | answered / reference / high |
| TIK | Cili është dallimi mes RAM dhe ROM? | BBC Bitesize · Memory types – GCSE Computer Science (transcript) | answered / reference / high |
| Histori | Cilat ishin idetë e Xhon Lokut? | Libër për mësuesin · Histori 11, PDF p. 130 | answered / reference / high |
| Kimi | Çka janë acidet dhe bazat sipas Arrheniusit? | Libër për mësuesin · Kimi 11, PDF p. 34 | answered / reference / high |

Additional demo results:

- **Më jep vetëm përgjigjen, s'kam kohë!** → `answered`; sources: 1 (using the preceding supported mathematics question).
- **Who won the NBA finals?** → `out_of_scope`; sources: 0.
- **Çka është metafora?** → `insufficient`; sources: 0.
- **Cilat janë veçoritë gjeografike të Kosovës?** → `insufficient`; sources: 0.

The required concise phrase also works inline with a question. With no previous question it asks for context; it never invents which answer the student means.

## 15. Known limitations

- Small manually reviewed corpus: most of the extracted teacher-guide pages are lesson plans, exercises or curriculum outcomes, not ready-made factual explanations. No arbitrary filler or unanswered MCQs were promoted.
- Metaphor has scope only, so “Çka është metafora?” correctly refuses; general Kosovo geography facts are not yet supported. German-subject coverage is absent.
- The two DOCX plans have uncertain provenance; the geography plan also has inconsistent grade evidence. They remain staged/unclassified, not verified.
- Lexical retrieval uses small multilingual stems and weighted token overlap. It can miss paraphrases or rank imperfectly; there are no embeddings. Confidence is retrieval coverage, not a correctness guarantee.
- No-provider mode shows topic notes rather than generating a bespoke exercise solution. New Kosovo notes are Albanian-only; missing translations are explicitly indicated in the UI. The model can translate when configured, but live translation was not tested.
- Prompt and response checks enforce source IDs, links, roles and common false provenance claims; they are not a complete factual-entailment verifier. Model responses still require evaluation with a real configured provider.
- Historical scope and curriculum scope cannot establish the current exam syllabus. Publisher approval does not turn a school book into a government publication.
- Ingestion prepares unverified candidates only; a person must review them before promotion. Text extraction can scramble formulas/tables. The live demo has no ingestion dependency.
- The UI retains only the previous question for concise follow-ups; it is not a persistent chat/history system.

## 16. Claims not to make in the pitch

Do not claim full Matura coverage, official endorsement, current official exam material, a verified 2024 exam bank, all Grade XII material, government authorship for PEGI/ALBAS, Kosovo provenance for BBC/OpenStax/British Council, guaranteed correctness, automatic verification of uploaded documents, or live LLM generation while running in reference mode.

A defensible pitch: “A lightweight tutor prototype that retrieves a small reviewed collection of Kosovo educational material, distinguishes curriculum and historical scope from external explanations, shows traceable sources, and declines unsupported questions.”

## 17. Exact start commands

Run from `C:\Users\Admin\OneDrive\Documents\ChatGPT\maturaAI`. If dependencies are missing, run `npm install` once.

Terminal 1:

```powershell
npm run server
```

Terminal 2:

```powershell
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173/. API status is http://127.0.0.1:3001/api/status. Configure `server/.env` from `server/.env.example` only if a compatible LLM provider is available; restart backend after changing configuration or knowledge JSON.
