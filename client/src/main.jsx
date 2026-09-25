import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3001/api'
  : '/api';

const subjects = ['Matematikë', 'Gjuhë Shqipe', 'Anglisht', 'Gjermanisht', 'TIK', 'Histori', 'Gjeografi', 'Kimi', 'Biologji'];
const examples = [
  { subject: 'Biologji', question: 'Ma shpjego fotosintezën', icon: 'leaf' },
  { subject: 'Matematikë', question: 'Si zgjidhet një ekuacion kuadratik?', icon: 'math' },
  { subject: 'TIK', question: 'Cili është dallimi mes RAM dhe ROM?', icon: 'chip' },
  { subject: 'Anglisht', question: 'Kur përdoret Present Perfect?', icon: 'language' },
];
const provenanceNames = {
  'official-kosovo-matura': 'OFFICIAL KOSOVO MATURA',
  'official-kosovo-curriculum': 'KOSOVO CURRICULUM',
  'kosovo-educational-material': 'KOSOVO EDUCATIONAL MATERIAL',
  'official-kosovo-matura-historical': 'HISTORICAL OFFICIAL MATERIAL',
  'trusted-external-reference': 'TRUSTED REFERENCE',
  unclassified: 'UNCLASSIFIED',
};
const evidenceNames = { explanation: 'Shpjegim', 'curriculum-scope': 'Fushë kurrikulare · jo shpjegim', 'study-method': 'Metodë ushtrimi' };
const confidenceNames = { high: 'High', medium: 'Medium', low: 'Limited' };

function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    book: <><path d="M12 6v15M12 6C8 3 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-1-10 2Z" /></>,
    leaf: <><path d="M20 3C8 2 2 7 5 15c7 5 15 1 15-12ZM5 20l10-11" /></>,
    math: <><path d="M18 5H6l7 7-7 7h12" /></>,
    chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z" /></>,
    language: <><path d="M3 5h12M9 3v2m-4 0c0 6 4 9 8 11M13 5c0 6-4 9-9 11m10 4 4-10 4 10m-6-4h4" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v1" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.book}</svg>;
}

async function request(path, body, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('Nuk u lidhëm me tutorin. Provo përsëri pas pak.'); }
  if (!response.ok) throw new Error(data.error || 'Kërkesa nuk u përfundua. Provo përsëri.');
  return data;
}

function Answer({ result }) {
  const limited = result.status === 'insufficient';
  const outside = result.status === 'out_of_scope';
  return <article className={`answer-card ${limited || outside ? 'limited-answer' : ''}`}>
    <div className="asked-question"><span>PYETJA JOTE</span><p>{result.question}</p></div>
    <div className="answer-body">
      <div className="answer-heading">
        <div className="tutor-avatar">m<span>·</span></div>
        <div><strong>MaturaAI</strong><span>{result.mode === 'llm' ? 'Shpjegim me AI · me kontekst nga burimet' : result.mode === 'reference' ? 'Shënime të kuruara · pa gjenerim me AI' : 'Përgjigje e kujdesshme'}</span></div>
        {result.subject && <span className="subject-badge">{result.subject}</span>}
      </div>
      {limited && <h2>Material i pamjaftueshëm</h2>}
      {outside && <h2>Jashtë fushës së MaturaAI</h2>}
      <div className="answer-text">{result.answer}</div>
      {result.answerLanguage && result.answerLanguage !== result.language && <p className="reference-note">Këto shënime janë në shqip; përkthimi me AI nuk është aktiv.</p>}
      {result.mode === 'reference' && <div className="reference-note"><Icon name="info" size={16} /><span>{result.reason === 'not_configured' ? 'Shpjegimi me AI nuk është aktiv. Këto janë shënimet e temës, të ruajtura në bazën e njohurive.' : 'Shpjegimi me AI nuk u verifikua ose nuk ishte i disponueshëm. Po shfaqim shënimet e temës.'}</span></div>}
      {result.sources.length > 0 && <section className="sources" aria-label="Sources used">
        <div className="section-caption"><Icon name="book" size={15} /><span>SOURCES USED</span></div>
        {result.sources.map(source => {
          const href = source.url || source.localFileUrl;
          const Tag = href ? 'a' : 'div';
          return <Tag className="source-card" {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})} key={source.id}>
            <span className="source-icon"><Icon name="book" size={20} /></span>
            <div><strong>{source.title}</strong>
              <span>{[source.publisher, source.year, source.grade ? `Klasa ${source.grade}` : source.grades ? `Klasat ${source.grades.join(', ')}` : null, source.page ? `Faqja PDF ${source.page}` : null].filter(Boolean).join(' · ')}</span>
              <span className="provenance-badge">{provenanceNames[source.type] || 'UNCLASSIFIED'}</span>
              <span>{evidenceNames[source.evidenceRole]} · {source.topic}</span>
              <span className={source.verified ? 'verified-label' : 'unverified-label'}>{source.verified ? '✓ Fragment i kontrolluar ndaj burimit' : 'Shënim i paverifikuar'}</span>
            </div>
            {href && <Icon name="external" size={17} />}
          </Tag>;
        })}
      </section>}
      <div className="answer-foot"><span className={`confidence ${result.confidence}`}><i />Knowledge confidence: <b>{confidenceNames[result.confidence]}</b></span><span>{result.verifiedOnly ? 'Verified Sources Only: ON' : 'Përfshirë shënime të paverifikuara'}</span></div>
      <p className="confidence-explanation">Besueshmëria tregon përputhjen me materialin e gjetur, jo një garanci saktësie.</p>
    </div>
  </article>;
}

function App() {
  const [question, setQuestion] = useState('');
  const [subject, setSubject] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resultRef = useRef(null);
  const inputRef = useRef(null);
  const activeRequest = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request('/status', null, controller.signal).then(setStatus).catch(() => setStatus({ offline: true }));
    return () => { controller.abort(); activeRequest.current?.abort(); };
  }, []);
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  async function ask(event) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    const asked = question.trim();
    const previousQuestion = result?.retrievalQuestion || result?.question;
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 40000);
    setBusy(true); setError(''); setResult(null);
    try {
      const answer = await request('/ask', { question: asked, previousQuestion, subject: subject || undefined, verifiedOnly }, controller.signal);
      setResult({ ...answer, question: asked });
    } catch (err) {
      setError(err.name === 'AbortError' ? 'Kërkesa zgjati shumë. Provo përsëri.' : err.message);
    } finally {
      clearTimeout(timeout); activeRequest.current = null; setBusy(false);
    }
  }

  function useExample(example) {
    setQuestion(example.question); setSubject(''); setError(''); inputRef.current?.focus();
  }
  const coverage = status?.subjects?.find(item => item.name === subject);

  return <>
    <header className="site-header">
      <a href="#top" className="brand" aria-label="MaturaAI home"><span className="logo">m<span>·</span></span><span>Matura<span className="brand-ai">AI</span><small>AI tutor for Kosovo's State Matura</small></span></a>
      <div className="header-right"><a href="#how-it-works">Si funksionon</a><span className="prototype-badge"><i />Hackathon prototype</span></div>
    </header>
    <main id="top">
      <section className="intro" aria-labelledby="page-title">
        <span className="eyebrow"><span className="tiny-star">✳</span> KURESHTJA JOTE. NJË FILLIM I MIRË.</span>
        <h1 id="page-title">Më pak hamendësime.<br /><em>Më shumë kuptim.</em></h1>
        <p>Grounded answers. Visible sources. No confident guessing.</p>
        <span className="intro-detail">Tutori yt për përgatitjen e Maturës Shtetërore të Kosovës.</span>
      </section>

      <section className="tutor-section" aria-label="Ask MaturaAI">
        <form className="composer" onSubmit={ask}>
          <div className="composer-top"><label htmlFor="question"><Icon name="book" size={18} />Çfarë dëshiron të kuptosh?</label><label className="verified-toggle"><input type="checkbox" role="switch" checked={verifiedOnly} disabled={busy} onChange={event => setVerifiedOnly(event.target.checked)} /><span className="switch-track"><span /></span><span>Verified Sources Only <b>{verifiedOnly ? '✓' : ''}</b></span></label></div>
          <textarea id="question" ref={inputRef} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Pyet diçka nga Matura..." maxLength={2000} rows={3} disabled={busy} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
          <div className="composer-bottom"><span><Icon name="shield" size={16} />{verifiedOnly ? 'Vetëm material i verifikuar. Burime të dukshme.' : 'Mund të përfshihen shënime lokale të paverifikuara.'}</span><button type="submit" className="primary" disabled={busy || !question.trim()}>{busy ? 'Po kërkoj…' : 'Pyet MaturaAI'}<Icon name="arrow" size={18} /></button></div>
        </form>
        {!verifiedOnly && <p className="toggle-note">Ky opsion lejon edhe shënime të paverifikuara nga baza lokale. Nuk aktivizon përgjigje pa burime nga njohuritë e modelit.</p>}
        <div className="subjects" role="group" aria-label="Filter by subject"><span className="subject-caption">LËNDA</span><button className={!subject ? 'selected' : ''} aria-pressed={!subject} disabled={busy} onClick={() => setSubject('')}>Të gjitha</button>{subjects.map(name => <button key={name} className={subject === name ? 'selected' : ''} aria-pressed={subject === name} disabled={busy} onClick={() => setSubject(subject === name ? '' : name)}>{name}</button>)}</div>
        {subject && coverage?.verifiedCount === 0 && <p className="coverage-note"><Icon name="info" size={15} />Për {subject} nuk kemi ende material të verifikuar. Do ta themi qartë kur mungon një burim.</p>}
        {error && <div className="error" role="alert"><Icon name="info" /><span>{error}</span><button onClick={() => setError('')} aria-label="Mbyll mesazhin">×</button></div>}
        {busy && <div className="loading" role="status"><span className="loading-dot" />Po kërkoj materialin përkatës në bazën e njohurive…</div>}
        <div ref={resultRef} className="result-anchor" aria-live="polite">{result && <Answer result={result} />}</div>
        {!result && !busy && <section className="examples" aria-label="Example questions"><div className="section-caption"><span>FILLIMI MUND TË JETË NJË PYETJE E VOGËL</span></div><div className="example-grid">{examples.map(example => <button key={example.subject} className="example-card" onClick={() => useExample(example)}><span className={`example-icon ${example.icon}`}><Icon name={example.icon} size={21} /></span><span><small>{example.subject}</small><strong>{example.question}</strong></span><Icon name="arrow" size={17} /></button>)}</div></section>}
      </section>

      <section id="how-it-works" className="how-it-works" aria-label="How MaturaAI works"><div className="section-caption">NJË PËRGJIGJE E MIRË KA NJË BAZË.</div><div className="principles"><article><span className="step">01</span><h2>Gjejmë materialin</h2><p>Pyetja jote lidhet me shënime arsimore të kuruara për temën.</p></article><article><span className="step">02</span><h2>Tregojmë burimet</h2><p>Hap referencat dhe shiko ku mbështetet shpjegimi.</p></article><article><span className="step">03</span><h2>I njohim kufijtë</h2><p>Kur materiali nuk mjafton, ta themi. Nuk e mbushim boshllëkun me hamendësime.</p></article></div></section>
      <div className="coverage-footer"><Icon name="info" size={16} /><p>Mbulim i kufizuar: materiale arsimore të Kosovës, kurrikula 2016, orientimi historik i Maturës 2014 dhe referenca të jashtme. “I verifikuar” do të thotë i kontrolluar ndaj burimit, jo domosdoshmërisht burim qeveritar.</p></div>
    </main>
    <footer><span className="footer-wordmark">MaturaAI <span>Të kuptosh është hapi i parë.</span></span><span className="service-state"><i className={status?.offline ? 'offline' : ''} />{status?.offline ? 'Lidhja me tutorin nuk është aktive' : status ? status.aiConfigured ? 'Tutor me AI · burime lokale' : 'Modaliteti i shënimeve të kuruara' : 'Po lidhemi…'}</span></footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
