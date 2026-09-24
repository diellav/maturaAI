# MaturaAI — final quality pass, 2026-09-25

## 1. Result and original retrieval failure

**23 → 79 chunks (+56)**, all traceable and reviewed. Existing React/Vite + Express architecture and UI retained. No new dependency or infrastructure. 8 populated subject files, 11 unique live sources, 10 unchanged raw files. Of 79 chunks, 66 are explanations, 6 study methods, 7 curriculum-scope records; these are not 79 complete lessons or 79 independently evaluated concepts.

Before the fix, the actual retrieval returned photosynthesis chunks for “fotosinteza”, but none for “qka o fotosinteza?” or “si funksionon fotosinteza?”. The unrecognized filler qka (and the process word funksionon) remained a content term. One matched term out of two failed the 0.66 coverage threshold. The fix removes conversational filler before matching while retaining intent separately. The same colloquial query now returns a readable Albanian answer with Albas Biologji 11, physical PDF page 54; this was also checked in the browser.

## 2. Chunks by subject

| Subject | Chunks |
|---|---:|
| Matematikë | 20 |
| Gjuhë Shqipe | 10 |
| Anglisht | 1 |
| Gjermanisht | 0 |
| TIK | 4 |
| Histori | 8 |
| Gjeografi | 3 |
| Kimi | 15 |
| Biologji | 18 |

No Physics corpus was added: no new real Physics source was present. Source types: 65 Kosovo educational material, 8 official curriculum, 2 historical official material, 4 external references. No current official Matura source is claimed.

## 3. Exact source files processed

**New raw files: none.** Recursive inventory found the same 7 PDFs and 2 DOCX educational documents, plus the nonacademic README. All 9 educational files were re-inspected using their extracted contents and metadata. Selected formula/table pages were also visually checked. The existing raw files were not changed; validation checked all 10 hashes.

- `Gjeografi-12-Plani-vjetor-2022-2023-9gubwj.docx`
- `gjuha-shqipe-dhe-letersia-12.pdf`
- `korniza-berthame-3-final.pdf`
- `liber-mesuesi-biologji-11-ks.pdf`
- `liber-mesuesi-histori-11-ks.pdf`
- `liber-mesuesi-kimi-11-ks.pdf`
- `matematika-12.pdf`
- `programi-orientues-dhe-modele-te-pyetje-per-provimin-e-matures-shteteror_1.pdf`
- `tik-12-natyror-ks-plan-ctq7ik.docx`

New promotions came from matematika-12.pdf, gjuha-shqipe-dhe-letersia-12.pdf, the three Albas teacher books and korniza-berthame-3-final.pdf. The 2014 guide was reviewed but contributed no new promotions. The two DOCX plans remain unclassified: uncertain publisher/year and, for Geography, conflicting grade indicators; scheduling text and topic lists were not turned into invented explanations. Source inventory/classification detail remains in the historical DATA_REFACTOR_REPORT.md.

## 4. Examples of new topics

- Mathematics: graphs, monotonicity, sum of functions, boundedness, parity, periodicity, composition, inverse relation, numerical sequences, recurrence, geometric progressions and limits.
- Albanian: paragraph coherence, contextual meaning, directed reading, essay practice, double-entry journal, Kafka’s Para ligjit, and themes of Njëqind vjet vetmi.
- Biology: ATP, glycolysis, chemosynthetic symbiosis, genetic crosses, dominance, phenotype/environment, transcription, genetic code, translation, luciferase, gradualism, species and Hardy–Weinberg equilibrium. The existing Kosovo photosynthesis explanation was also strengthened.
- Chemistry: conjugate pairs, Lewis acids/bases, electrolytes, acid strength, dissociation degree, buffers, indicators, redox, corrosion, alkali/alkaline-earth metals, industrial sodium and lime.
- History: Hobbes, Montesquieu, pashaliks, US separation of powers, Eastern trade examples and comparing historical sources.
- Geography: the listed geospheres and a method for analysing regions. TIK: algorithms and digital communication principles. The algorithm definition is explicitly supported by the Mathematics section of the cross-subject core curriculum.

Chunks paraphrase explicit content with physical PDF page citations. Material includes worked explanations, tables and explicit learning outcomes; it excludes unanswered exercise solutions and administrative boilerplate. Obvious source errors were excluded (including reversed redox agent labels, misleading genetics wording, an incorrect direct US presidential-election claim and inconsistent author labels). Curricular scope is labelled separately from explanatory evidence.

## 5. Exact normalization and scoring rules

1. NFKC normalization, then NFD accent folding, lowercase, non-alphanumeric punctuation to spaces, trim/split and deduplicate terms. Thus ç/ë and decomposed Unicode forms compare consistently; original student wording stays intact.
2. Token aliases: qka/qa → cka; osht/asht/oshte → eshte; jon/jan/jone → jane; shpjegoma → shpjego. cka/eshte already result from accent folding.
3. Remove conversational question/filler tokens including cka, cfare, eshte, jane, si, pse, kur, ku, kush, cili/cila/cilat/cilen, ma/me, trego/tregom/tregoma, shpjego/shpjegoni/shpjegim, dmth, funksionon/funksionojne, rendesishme/rendesishem, thuaj, mundesh, pak, thjesht, lutna and ta, alongside articles/conjunctions and the existing English/German filler list. The complete executable list is in server/services/retrievalService.js. Domain qualifiers such as natën remain; RAM, ROM and pH remain intact.
4. Explicit word families cover photosynthesis, function, enzymes, acids, bases, quadratic, discriminant, chlorophyll, chloroplast, memory, Arrhenius, formula, idea, linking and analysis. For other tokens of at least 8 characters, strip at most one of ave/eve/it/in/en/es/et. Exact families handle short domain words without arbitrary truncation.
5. Subject names are retained as hints but excluded from concept coverage: “ma shpjego funksionin në matematikë” retains function and subject intent. With all subjects selected, the selected answer evidence supplies the subject. Explicit subject selection remains a strict filter.
6. Per-term exact heading/topic score 4, keyword 3, body 1; stem match gets 90% of those weights; an exact normalized/stemmed phrase adds 2. Require a heading/keyword match (or bounded fuzzy concept match), coverage ≥0.66 and score ≥1. Keep at most 4 candidates scoring at least half the best relevance score. Subject hint adds 0.5; source authority adds only 0.1–0.45 after relevance gating.
7. Definition, explanation, process, comparison and reason intent are carried separately to the generation prompt. Reference mode returns readable curated topic notes, with separate source cards; it does not pretend to perform generated reasoning.

## 6. Typo approach

One insertion, deletion, substitution or adjacent transposition only, on tokens of at least 7 characters, with the same first character and length difference ≤1. Compare raw and conservative stems. Fuzzy matching is limited to headings/keywords, only when no exact/stem match exists for that query token, and scores 1.1 per term. Exact/stem relevance outranks fuzzy; short terms are never fuzzy matched. A fuzzy best match is medium confidence. “qka o fotosinyteza?” retrieves the same photosynthesis concept; multiple unrelated edits do not. Confidence describes retrieval, not guaranteed answer correctness.

## 7. Validation and evaluation

- npm run validate:data: PASS — 8 subject files, 11 unique sources, 79 chunks, raw integrity 10/10, copied MCQ records 0.
- npm test: PASS — **103/103**, zero failures/skips (52 preceding tests plus 47 question cases and 4 targeted normalization/ranking/filter tests).
- npm run stats:data: PASS — counts above, all 79 verified.
- npm run demo:data: PASS — 5 subject-group examples plus concise follow-up, NBA refusal and 2 unsupported-question guardrails.
- npm run build: PASS — Vite production build.
- npm run eval:natural: **47/47 retrieval hits**, covering **33 distinct underlying concepts**; 47/47 curated reference answers cite the expected concept. The first run found 44/47; explicit formula/idea/link/analysis variants and filler cilen/ta fixed the three misses without lowering the global threshold.

NATURAL_QUESTION_RESULTS.md and NATURAL_QUESTION_RESULTS.json record every question, expected topic, retrieved topics, hit, confidence and selected source. The fixed fixture is server/test/fixtures/natural-questions.json. Variants count once for concept coverage. This is a curated regression set, not an independent benchmark; citation selection and retrieval are measured, not automatic semantic correctness. No live LLM provider was configured or certified.

Browser check: initial “Verified Sources Only” switch is checked and “Të gjitha” selected; frontend initializes useState(true). API omission also defaults true. Tests prove unverified notes are excluded when ON and eligible when OFF. The colloquial photosynthesis question showed a readable answer and the real Albas PDF-page link in the UI.

## 8. Seven API checks

Actual POST requests to http://127.0.0.1:3001/api/ask, with no subject supplied and verifiedOnly omitted (all returned true):

| Query | HTTP / result | Inferred subject | Confidence | Selected source |
|---|---|---|---|---|
| 1. qka o fotosinteza? | 200 / answered | Biologji | high | Libër për mësuesin · Biologji 11 · PDF p. 54 |
| 2. çka është fotosinteza? | 200 / answered | Biologji | high | Libër për mësuesin · Biologji 11 · PDF p. 54 |
| 3. ma shpjego funksionin | 200 / answered | Matematikë | high | Libër për mësuesin · Matematika 12 · PDF p. 39 |
| 4. qka jon acidet dhe bazat? | 200 / answered | Kimi | high | Libër për mësuesin · Kimi 11 · PDF p. 34 |
| 5. qka osht dallimi mes RAM edhe ROM? | 200 / answered | TIK | high | BBC Bitesize · Memory types – GCSE Computer Science (transcript) |
| 6. Më jep vetëm përgjigjen, s'kam kohë! | 200 / answered | TIK | high | BBC Bitesize · Memory types – GCSE Computer Science (transcript) |
| 7. Who won the NBA finals? | 200 / out_of_scope | — | low | No source; refusal |

Query 6 followed RAM/ROM via previousQuestion and returned one sentence: “RAM mban përkohësisht të dhënat e punës dhe i humbet pa energji; ROM ruan udhëzimet e nisjes edhe pa energji.” The source stayed visible. NBA returned the scope refusal with no sources. The first six were curated reference mode, not a live model response.

## 9. Ten tested live-demo questions

1. qka o fotosinteza?
2. ma shpjego funksionin
3. qka jon acidet dhe bazat?
4. qka osht dallimi mes RAM edhe ROM?
5. Si funksionon përbërja e funksioneve?
6. Qka osht glikoliza?
7. Qka osht tretësira buferike?
8. Si përdoret ditari dypjesësh?
9. Si ndahet pushteti sipas Kushtetutës amerikane në material?
10. Kur përdoret Present Perfect?

These all passed with no subject selection and verified-only enabled. Follow any answered question with “Më jep vetëm përgjigjen, s'kam kohë!” to demonstrate concise context handling.

## 10. Remaining gaps

Gjeografi (3) and TIK (4) remain below the aspirational target; the local DOCX plans did not justify more verified factual explanations. English retains one reference; German has no chunks; Physics has no added source. Current official Matura coverage is not established, and 2014 material stays historical. Some literary and geographical records are study methods or scope, not full literary analyses or regional fact sheets. Unsupported questions such as defining metaphor or listing Kosovo’s full geographical features still correctly return insufficient evidence. There is no claim of full Matura coverage.

Lexical normalization is intentionally limited; more independent student phrasing and an actual configured provider need separate evaluation. Reference notes do not rewrite every intent into a bespoke answer. Source review found errors in otherwise useful teacher books, so verified means the promoted passage was checked, not that the entire document is error-free.

## Appendix: exact newly promoted chunk IDs

- math_graph
- math_monotonic
- math_sum_functions
- math_bounded
- math_parity
- math_periodic
- math_composition
- math_inverse_relation
- math_sequence
- math_recursive
- math_geometric
- math_sequence_limit
- math_function_limit
- math_polynomial_limit
- bio_energy
- bio_glycolysis
- bio_symbiosis
- bio_crosses
- bio_dominance
- bio_phenotype
- bio_transcription
- bio_genetic_code
- bio_translation
- bio_luciferase
- bio_gradualism
- bio_species
- bio_hardy_weinberg
- chem_conjugate
- chem_lewis
- chem_electrolytes
- chem_acid_strength
- chem_dissociation_degree
- chem_buffer
- chem_indicator
- chem_redox
- chem_corrosion
- chem_alkali_metals
- chem_sodium
- chem_lime
- sq_paragraph
- sq_context
- sq_directed_reading
- sq_essay_practice
- sq_double_journal
- sq_kafka
- sq_marquez
- history_hobbes
- history_montesquieu
- history_pashaliks
- history_us_powers
- history_east_trade
- history_sources_method
- ict_algorithm
- geo_geospheres
- geo_region_analysis
- ict_communication_ethics
