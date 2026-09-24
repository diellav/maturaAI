# MaturaAI

A lightweight study tutor for Kosovo upper-secondary students: retrieve local evidence, explain when supported, show actual provenance, and acknowledge gaps. The existing React/Vite + Express app is retained; no database or vector service is required.

## Start

From this repository root, install once with `npm install`, then use two terminals:

```powershell
npm run server
```

```powershell
npm run dev -- --host 127.0.0.1
```

Frontend: http://127.0.0.1:5173/ · API: http://127.0.0.1:3001/api/status

With no provider configured, the UI explicitly displays curated source notes, not a simulated AI answer. To enable generation, copy `server/.env.example` to `server/.env` and fill `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL` for a compatible chat-completions provider supporting JSON responses. Keep credentials local. Restart the backend after configuration or data changes. Provider failure falls back to clearly labelled reference notes.

## Data and provenance

- `server/data/source/`: ten original raw files, unchanged. The source catalog records hashes, classification evidence and metadata uncertainty.
- `server/data/source-catalog.json`: inventory of all raw files, including two unclassified DOCX plans and the nonacademic README.
- `server/data/knowledge/manifest.json`: only existing populated subject files are loaded.
- `server/data/knowledge/*.json`: source registry and individually reviewed conceptual/scope chunks. General sources may recur across subjects only with identical metadata and a shared ID.
- `server/data/questions/`: question records and their schema, separate from conceptual knowledge. The existing 2024 math file is empty. Original legacy files remain intact as migration references.
- `server/data/maturaKnowledge.json` and its schema: preserved legacy snapshot, no longer the live retrieval source.

`verified=true` means a chunk was checked against a traceable source. It does not mean government authorship. PEGI/ALBAS are educational publishers; the curriculum is from 2016 and official Matura material is historical (2014). Grade XI stays XI. No current official Matura coverage is claimed. PDF pages are physical 1-based pages; printed page numbers can differ. Unknown publication URLs remain null; source cards open registered local PDFs at the cited page.

Scope chunks establish curriculum or historical topic relevance; they cannot alone answer a definition or mechanism question. External references remain distinct backup explanations. The retrieval score weights title/topic/subtopic, keywords and content, then applies a small authority bonus; selected subject and verified-only are strict filters. Up to four relevant chunks are sent to the model. Confidence comes from retrieval coverage, not model self-assessment.

For “Më jep vetëm përgjigjen, s'kam kohë!”, include a question or ask it after an answered question. The client sends the previous question; the server retrieves evidence again under the current filters and gives at most two sentences. With no prior question, it asks which question to answer. Source cards remain visible.

## Checks and demo

```powershell
npm test
npm run validate:data
npm run stats:data
npm run demo:data
npm run eval:natural
npm run build
```

`demo:data` selects supported questions from actual chunk metadata and tests five subject groups, concise mode, NBA refusal, and real coverage gaps. It deliberately uses local reference mode to be reproducible without credentials; it does not certify a live LLM provider.

The original 23 regression tests remain, using the four migrated references as a fixed fixture. Added tests cover manifest integrity, provenance, source resolution, ranking, evidence roles, concise follow-ups, HTTP source links and the final dataset.

## Optional future ingestion

Place PDFs/DOCX files in `server/data/source/inbox/`, then run:

```powershell
npm run ingest:data
```

This writes extracted text and **unverified candidates** under `server/data/ingestion/`. It never modifies the live manifest. The live app does not require Python or ingestion. For ingestion only, install Python plus `pypdf` and `python-docx`; set `PYTHON_BIN` if Python is not on PATH. The runner also detects the installed Codex Python runtime on this machine.

Review reading order, headings, publisher, date, grade, subject, formula correctness, provenance and PDF page/DOCX locator before copying small conceptual chunks into a subject file. Keep MCQs in question data. Use null for unknown metadata; never promote uncertain provenance to verified. Add only populated subject files to the manifest, then rerun validation and tests. An image-only PDF is skipped/reported; OCR is not automatically attempted.

Current quality pass: 79 reviewed chunks (23 before), 103 passing tests, and 47 natural-question cases across 33 concepts. See `QUALITY_PASS_REPORT.md` for current results, source inventory, demo questions and remaining gaps; `NATURAL_QUESTION_RESULTS.md` records every retrieval result. `DATA_REFACTOR_REPORT.md` is the historical initial-refactor report.
