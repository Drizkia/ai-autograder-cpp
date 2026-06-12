'use client';

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  Upload, FileText, FolderArchive, CheckCircle2,
  AlertCircle, XCircle, Terminal, Download, Search, RefreshCw,
  Code, Award, ShieldAlert, FileSpreadsheet, ChevronRight, HelpCircle,
  Play, Check, Loader2, Sparkles, BookOpen, User, CheckCircle
} from 'lucide-react';
import {
  DEFAULT_STUDENTS,
  GRADING_STEPS,
  CONSOLE_LOGS_TEMPLATE,
  StudentResult,
  GradingStep,
  RubricCriteria,
  CodeAnnotation
} from './mockData';

export default function Home() {
  const [appState, setAppState] = useState<'upload' | 'grading' | 'dashboard'>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isParsingZip, setIsParsingZip] = useState(false);
  const [detectedZipFiles, setDetectedZipFiles] = useState<{ name: string; content: string }[]>([]);
  const [gradingRigor, setGradingRigor] = useState<'standard' | 'strict' | 'permissive'>('standard');
  const [rubricFocus, setRubricFocus] = useState({ syntax: true, memory: true, complexity: true, plagiarism: true });
  const [rubricWeights, setRubricWeights] = useState<{id: number; name: string; weight: number}[]>([
    { id: 1, name: 'Soal 1 (Core Logic)', weight: 40 },
    { id: 2, name: 'Soal 2 (Edge Cases)', weight: 60 }
  ]);
  const [steps, setSteps] = useState<GradingStep[]>(GRADING_STEPS);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'warning' | 'fail'>('all');
  const [activeTab, setActiveTab] = useState<'code' | 'rubric' | 'summary'>('code');
  const [expandedAnnotations, setExpandedAnnotations] = useState<{ [line: number]: boolean }>({});

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputPdfRef = useRef<HTMLInputElement>(null);
  const fileInputZipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const getLineOfKeyword = (code: string, keyword: string): number => {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(keyword)) return i + 1;
    }
    return 0;
  };

  const handleZipSelection = async (file: File) => {
    setZipFile(file);
    setIsParsingZip(true);
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const cppFiles: { name: string; content: string }[] = [];
      const filePromises = Object.entries(contents.files).map(async ([filename, fileObj]) => {
        if (!fileObj.dir && (filename.endsWith('.cpp') || filename.endsWith('.h') || filename.endsWith('.hpp') || filename.endsWith('.c') || filename.endsWith('.cc'))) {
          const textContent = await fileObj.async('text');
          cppFiles.push({ name: filename, content: textContent });
        }
      });
      await Promise.all(filePromises);
      setDetectedZipFiles(cppFiles);
    } catch (err) {
      console.error('Error unzipping:', err);
    } finally {
      setIsParsingZip(false);
    }
  };

  const simulateGradingProcess = () => {
    setAppState('grading');
    setConsoleLogs([]);
    setCurrentProgress(0);
    setSteps(GRADING_STEPS.map(s => ({ ...s, status: 'pending' })));
    let logIndex = 0;
    const totalLogs = CONSOLE_LOGS_TEMPLATE.length;
    const timer = setInterval(() => {
      if (logIndex < totalLogs) {
        const log = CONSOLE_LOGS_TEMPLATE[logIndex];
        setConsoleLogs(prev => [...prev, log.text]);
        setCurrentProgress(Math.round(((logIndex + 1) / totalLogs) * 100));
        setSteps(prevSteps => prevSteps.map(step => {
          if (step.id === log.step) return { ...step, status: 'running' };
          else if (CONSOLE_LOGS_TEMPLATE.findIndex(l => l.step === step.id) < CONSOLE_LOGS_TEMPLATE.findIndex(l => l.step === log.step))
            return { ...step, status: 'completed' };
          return step;
        }));
        logIndex++;
      } else {
        clearInterval(timer);
        setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        let gradingResults: StudentResult[] = detectedZipFiles.length > 0 ? processDynamicFiles(detectedZipFiles) : DEFAULT_STUDENTS;
        if (gradingRigor === 'strict') {
          gradingResults = gradingResults.map(s => {
            const newScore = Math.max(0, s.score - 8);
            return { ...s, score: newScore, status: newScore >= 80 ? 'pass' : newScore >= 45 ? 'warning' : 'fail' };
          });
        } else if (gradingRigor === 'permissive') {
          gradingResults = gradingResults.map(s => {
            const newScore = Math.min(100, s.score + 5);
            return { ...s, score: newScore, status: newScore >= 80 ? 'pass' : newScore >= 55 ? 'warning' : 'fail' };
          });
        }
        setResults(gradingResults);
        setSelectedStudent(gradingResults[0] || null);
        setTimeout(() => setAppState('dashboard'), 800);
      }
    }, 120);
  };

  const processDynamicFiles = (files: { name: string; content: string }[]): StudentResult[] => {
    return files.map((file, idx) => {
      let name = file.name.replace(/\.[^/.]+$/, '').replace(/^.*[\\\/]/, '').replace(/[-_]/g, ' ').replace(/\d+/g, '').trim();
      name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).filter(w => w.length > 0).join(' ');
      if (!name) name = `Submission #${idx + 1}`;
      const code = file.content;
      const annotations: CodeAnnotation[] = [];
      if (rubricFocus.syntax && code.includes('using namespace std;')) {
        annotations.push({ line: getLineOfKeyword(code, 'using namespace std;') || 2, type: 'info', message: 'AI Suggestion: "using namespace std;" can lead to global name conflicts. Prefix types explicitly (e.g. std::cout).' });
      }
      const hasNew = code.includes('new ');
      const hasDelete = code.includes('delete ');
      if (rubricFocus.memory && hasNew && !hasDelete) {
        annotations.push({ line: getLineOfKeyword(code, 'new ') || 6, type: 'error', message: 'Memory Diagnostic Alert: Dynamic allocation detected using "new", but no matching "delete" found. Memory leak risk.' });
      } else if (rubricFocus.memory && hasNew && hasDelete) {
        annotations.push({ line: getLineOfKeyword(code, 'delete') || 15, type: 'info', message: 'AI Note: Manual deallocation is correct, but modern C++ recommends std::unique_ptr or std::vector (RAII).' });
      }
      if (rubricFocus.complexity && (code.includes('(low + high) / 2') || code.includes('(low+high)/2'))) {
        annotations.push({ line: getLineOfKeyword(code, 'low') || 10, type: 'warning', message: 'Overflow warning: `low + high` can exceed int range. Use `low + (high - low) / 2`.' });
      }
      const firstFor = code.indexOf('for');
      const secondFor = firstFor !== -1 ? code.indexOf('for', firstFor + 3) : -1;
      const hasNestedLoop = firstFor !== -1 && secondFor !== -1 && secondFor - firstFor < 120;
      if (rubricFocus.complexity && hasNestedLoop) {
        annotations.push({ line: getLineOfKeyword(code, 'for') || 8, type: 'warning', message: 'Performance Warning: Nested loops detected. Verify complexity does not violate rubric O(N log N) requirements.' });
      }
      const lines = code.split('\n');
      const commentCount = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('/*')).length;
      if (commentCount === 0) {
        annotations.push({ line: Math.min(5, lines.length), type: 'info', message: 'Code Quality: Consider adding header block documentation and descriptive function docstrings.' });
      }
      let correctness = 50, memory = 30, style = 20;
      if (hasNew && !hasDelete) memory -= 25;
      if (hasNestedLoop) memory -= 8;
      if (code.includes('(low + high) / 2')) memory -= 4;
      if (code.includes('using namespace std;')) style -= 4;
      if (commentCount === 0) style -= 6;
      if (code.length < 50) { correctness = 0; memory = 0; style = 0; }
      const score = correctness + memory + style;
      const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail';
      const rubricBreakdown: RubricCriteria[] = [
        { name: 'Core Correctness', maxScore: 50, score: correctness, feedback: correctness === 0 ? 'Empty or uncompilable submission.' : 'Passed 10/10 automated IO test suites.' },
        { name: 'Memory & Complexity', maxScore: 30, score: memory, feedback: memory === 30 ? 'Fully optimized data structures.' : 'Contains complexity warning or raw allocation warnings.' },
        { name: 'Style & Readability', maxScore: 20, score: style, feedback: style === 20 ? 'Adheres cleanly to guidelines.' : 'Missing documentation blocks or uses global namespaces.' }
      ];
      return { id: `dyn-std-${idx}`, name, filename: file.name, code, score, status, rubricBreakdown, aiSummary: `Parsed submission file: ${file.name}. Syntactical validation complete. AI evaluation reports ${annotations.filter(a => a.type === 'error').length} blocking errors, and ${annotations.filter(a => a.type === 'warning').length} architectural suggestions. Clean compiling target structure.`, annotations };
    });
  };

  const loadSampleAssessment = () => {
    setPdfFile(new File([], 'cpp_binary_search_rubric.pdf'));
    setZipFile(new File([], 'student_submissions_bs.zip'));
    setDetectedZipFiles([]);
  };

  const handleReset = () => {
    setAppState('upload'); setPdfFile(null); setZipFile(null);
    setDetectedZipFiles([]); setResults([]); setSelectedStudent(null);
  };

  const handleExportCSV = () => {
    if (!results.length) return;
    let csv = 'data:text/csv;charset=utf-8,Student Name,Filename,Score,Status,Correctness,Complexity,Style,AI Summary\n';
    results.forEach(s => {
      csv += [`"${s.name}"`, `"${s.filename}"`, s.score, s.status.toUpperCase(), s.rubricBreakdown[0]?.score || 0, s.rubricBreakdown[1]?.score || 0, s.rubricBreakdown[2]?.score || 0, `"${s.aiSummary.replace(/"/g, '""')}"`].join(',') + '\n';
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = 'syntaxgrader_report.csv';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleExportText = () => {
    if (!results.length) return;
    let txt = `====================================================\nSYNTAXGRADER ASSESSMENT REPORT\nRubric File: ${pdfFile?.name || 'Template'}\nGenerated: ${new Date().toLocaleDateString()}\n====================================================\n\n`;
    results.forEach(s => {
      txt += `STUDENT: ${s.name}\nFilename: ${s.filename}\nGrade: ${s.score}/100 [${s.status.toUpperCase()}]\n----\n`;
      s.rubricBreakdown.forEach(r => { txt += `- ${r.name}: ${r.score}/${r.maxScore}\n  ${r.feedback}\n`; });
      txt += `\nAI Summary:\n${s.aiSummary}\n\n====================================================\n\n`;
    });
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'syntaxgrader_ai_report.txt';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleAnnotation = (line: number) => setExpandedAnnotations(prev => ({ ...prev, [line]: !prev[line] }));

  const averageScore = results.length > 0 ? Math.round(results.reduce((a, c) => a + c.score, 0) / results.length) : 0;
  const passRate = results.length > 0 ? Math.round((results.filter(s => s.score >= 70).length / results.length) * 100) : 0;
  const totalWarnings = results.reduce((a, c) => a + c.annotations.filter(x => x.type === 'warning' || x.type === 'error').length, 0);

  const filteredStudents = results.filter(s => {
    const q = searchQuery.toLowerCase();
    const match = s.name.toLowerCase().includes(q) || s.filename.toLowerCase().includes(q);
    return statusFilter === 'all' ? match : match && s.status === statusFilter;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative', zIndex: 1 }}>

      {/* ===== HEADER STRIPE ===== */}
      <div className="header-rule" />

      {/* ===== NAVBAR ===== */}
      <header style={{
        background: 'white',
        borderBottom: '3px solid rgba(61,44,30,0.12)',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 0 rgba(61,44,30,0.06)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* LOGO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, background: 'var(--orange)', border: '2px solid rgba(61,44,30,0.2)',
              boxShadow: '3px 3px 0 rgba(61,44,30,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4
            }}>
              <Code style={{ width: 20, height: 20, color: 'white' }} />
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--brown)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                Syntax<span style={{ color: 'var(--orange)' }}>Grader</span>
              </h1>
              <p style={{ fontSize: 10, color: 'var(--brown-light)', fontFamily: "'Space Mono', monospace", marginTop: 2, opacity: 0.7 }}>
                AI C++ Assessment Engine
              </p>
            </div>

            {/* decorative tape */}
            <span className="tape animate-wiggle" style={{ marginLeft: 8 }}>v1.0 beta</span>
          </div>

          {/* RIGHT NAV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="sticker">
              <Sparkles style={{ width: 10, height: 10 }} />
              Simulated AI Mode
            </span>
            {appState !== 'upload' && (
              <button className="btn-secondary" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <RefreshCw style={{ width: 13, height: 13 }} />
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>

        {/* ===== PHASE 1: UPLOAD ===== */}
        {appState === 'upload' && (
          <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24 }}>

            {/* HERO TEXT */}
            <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 580 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className="tape-orange tape" style={{ fontSize: 10 }}>STEP 1 OF 3</span>
              </div>
              <h2 className="font-display" style={{
                fontSize: 44, fontWeight: 800, color: 'var(--brown)', lineHeight: 1.1,
                letterSpacing: '-0.03em', marginBottom: 14
              }}>
                Automate Your<br />
                <span style={{
                  background: 'var(--yellow)', padding: '0 8px', display: 'inline-block',
                  transform: 'rotate(-0.5deg)', marginTop: 2
                }}>C++ Grading</span>
              </h2>
              <p style={{ color: 'var(--brown-light)', fontSize: 15, lineHeight: 1.6, opacity: 0.8 }}>
                Upload your assignment rubric PDF and a ZIP file of student C++ submissions.
                Our AI agent extracts the rubric, builds the code, and generates detailed feedback.
              </p>
            </div>

            {/* FILE UPLOAD CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, width: '100%', maxWidth: 720, marginBottom: 24 }}>

              {/* PDF UPLOAD */}
              <div
                onClick={() => fileInputPdfRef.current?.click()}
                className={`drop-zone paper-fold${pdfFile ? ' active' : ''}`}
                style={{ minHeight: 180 }}
              >
                <input type="file" ref={fileInputPdfRef} onChange={e => setPdfFile(e.target.files?.[0] || null)} accept=".pdf" style={{ display: 'none' }} />

                <div style={{
                  width: 52, height: 52,
                  background: pdfFile ? 'var(--orange)' : 'var(--bg)',
                  border: `2px solid ${pdfFile ? 'rgba(255,107,26,0.4)' : 'var(--border-dark)'}`,
                  boxShadow: '3px 3px 0 rgba(61,44,30,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, marginBottom: 14, transition: 'all 0.15s ease'
                }}>
                  <FileText style={{ width: 24, height: 24, color: pdfFile ? 'white' : 'var(--brown-light)' }} />
                </div>

                {pdfFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <span className="sticker-green sticker" style={{ marginBottom: 10, display: 'inline-flex' }}>
                      <Check style={{ width: 10, height: 10 }} />Rubric Loaded
                    </span>
                    <p className="font-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown)', marginTop: 8, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile.name}</p>
                    <button onClick={e => { e.stopPropagation(); setPdfFile(null); }} style={{ marginTop: 10, fontSize: 11, color: 'var(--brown-light)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Change file</button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p className="font-display" style={{ fontWeight: 700, fontSize: 15, color: 'var(--brown)', marginBottom: 6 }}>Upload Rubric</p>
                    <p style={{ fontSize: 12, color: 'var(--brown-light)', opacity: 0.6 }}>PDF problem set or rubric file</p>
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--orange)', color: 'white', borderRadius: 4, padding: '5px 12px', fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", border: '1.5px solid rgba(61,44,30,0.2)', boxShadow: '2px 2px 0 rgba(61,44,30,0.15)' }}>
                      <Upload style={{ width: 11, height: 11 }} /> Browse PDF
                    </div>
                  </div>
                )}
              </div>

              {/* ZIP UPLOAD */}
              <div
                onClick={() => fileInputZipRef.current?.click()}
                className={`drop-zone${zipFile ? ' active' : ''}`}
                style={{ minHeight: 180 }}
              >
                <input type="file" ref={fileInputZipRef} onChange={e => { const f = e.target.files?.[0]; if (f) handleZipSelection(f); }} accept=".zip" style={{ display: 'none' }} />

                <div style={{
                  width: 52, height: 52,
                  background: zipFile ? 'var(--orange)' : 'var(--bg)',
                  border: `2px solid ${zipFile ? 'rgba(255,107,26,0.4)' : 'var(--border-dark)'}`,
                  boxShadow: '3px 3px 0 rgba(61,44,30,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4, marginBottom: 14, transition: 'all 0.15s ease'
                }}>
                  {isParsingZip
                    ? <Loader2 style={{ width: 24, height: 24, color: 'var(--orange)' }} className="animate-spin" />
                    : <FolderArchive style={{ width: 24, height: 24, color: zipFile ? 'white' : 'var(--brown-light)' }} />
                  }
                </div>

                {zipFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <span className={`sticker ${detectedZipFiles.length > 0 ? 'sticker-orange' : 'sticker-green'}`} style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {detectedZipFiles.length > 0 ? <>{detectedZipFiles.length} C++ files</> : <><Check style={{ width: 10, height: 10 }} />ZIP Loaded</>}
                    </span>
                    <p className="font-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown)', marginTop: 8, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zipFile.name}</p>
                    <button onClick={e => { e.stopPropagation(); setZipFile(null); setDetectedZipFiles([]); }} style={{ marginTop: 10, fontSize: 11, color: 'var(--brown-light)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Change zip</button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p className="font-display" style={{ fontWeight: 700, fontSize: 15, color: 'var(--brown)', marginBottom: 6 }}>Upload Submissions</p>
                    <p style={{ fontSize: 12, color: 'var(--brown-light)', opacity: 0.6 }}>ZIP archive containing student .cpp files</p>
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'white', color: 'var(--brown)', borderRadius: 4, padding: '5px 12px', fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", border: '2px solid var(--border-dark)', boxShadow: '2px 2px 0 rgba(61,44,30,0.12)' }}>
                      <Upload style={{ width: 11, height: 11 }} /> Browse ZIP
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AGENT CONFIG */}
            <div className="paper-card" style={{ width: '100%', maxWidth: 720, padding: '24px 28px', marginBottom: 28 }}>
              {/* header tape */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span className="tape" style={{ transform: 'rotate(-0.5deg)' }}>AI Agent Config</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* GRADING RIGOR */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--brown-light)', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Grading Rigor
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['permissive', 'standard', 'strict'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setGradingRigor(r)}
                        style={{
                          flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                          fontFamily: "'Space Grotesk', sans-serif", borderRadius: 4, cursor: 'pointer',
                          border: '2px solid',
                          borderColor: gradingRigor === r ? 'var(--orange)' : 'var(--border-dark)',
                          background: gradingRigor === r ? 'var(--orange)' : 'white',
                          color: gradingRigor === r ? 'white' : 'var(--brown-light)',
                          boxShadow: gradingRigor === r ? '2px 2px 0 rgba(255,107,26,0.25)' : '2px 2px 0 rgba(61,44,30,0.1)',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, marginTop: 8, color: 'var(--brown-light)', opacity: 0.7, fontFamily: "'Space Mono', monospace" }}>
                    {gradingRigor === 'standard' && 'Exact rubric point matching.'}
                    {gradingRigor === 'strict' && 'Heavier penalties for violations.'}
                    {gradingRigor === 'permissive' && 'Prioritizes output logic with bonuses.'}
                  </p>
                </div>

                {/* RUBRIC FOCUS */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--brown-light)', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Checklist Focus
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { key: 'syntax', label: 'Syntax Check' },
                      { key: 'memory', label: 'Memory Leaks' },
                      { key: 'complexity', label: 'Complexity' },
                      { key: 'plagiarism', label: 'Plagiarism' },
                    ].map(({ key, label }) => (
                      <label key={key} className="check-label">
                        <input
                          type="checkbox"
                          checked={rubricFocus[key as keyof typeof rubricFocus]}
                          onChange={e => setRubricFocus({ ...rubricFocus, [key]: e.target.checked })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RUBRIC WEIGHTS CONFIG */}
            <div className="paper-card" style={{ width: '100%', maxWidth: 720, padding: '24px 28px', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span className="tape tape-orange" style={{ transform: 'rotate(0.5deg)' }}>Bobot Sub-Soal</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rubricWeights.map((weight, index) => (
                  <div key={weight.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={weight.name}
                      onChange={e => {
                        const newWeights = [...rubricWeights];
                        newWeights[index].name = e.target.value;
                        setRubricWeights(newWeights);
                      }}
                      className="search-input"
                      style={{ flex: 1, padding: '8px 12px' }}
                      placeholder="e.g. Soal 1"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-warm)', padding: '6px 12px', borderRadius: 4, border: '2px solid var(--border-dark)' }}>
                      <input 
                        type="number" 
                        value={weight.weight}
                        onChange={e => {
                          const newWeights = [...rubricWeights];
                          newWeights[index].weight = Number(e.target.value);
                          setRubricWeights(newWeights);
                        }}
                        style={{ width: 50, background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--brown)', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brown-light)' }}>%</span>
                    </div>
                    <button 
                      onClick={() => setRubricWeights(rubricWeights.filter(w => w.id !== weight.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--red-accent)' }}
                    >
                      <XCircle style={{ width: 18, height: 18 }} />
                    </button>
                  </div>
                ))}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <button 
                    onClick={() => setRubricWeights([...rubricWeights, { id: Date.now(), name: `Soal ${rubricWeights.length + 1}`, weight: 0 }])}
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    + Tambah Sub-Soal
                  </button>
                  <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: rubricWeights.reduce((a, b) => a + b.weight, 0) === 100 ? 'var(--green-accent)' : 'var(--red-accent)', fontWeight: 700 }}>
                    Total: {rubricWeights.reduce((a, b) => a + b.weight, 0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION ROW */}
            <div style={{ width: '100%', maxWidth: 720, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <button
                onClick={loadSampleAssessment}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--brown-light)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}
              >
                <BookOpen style={{ width: 15, height: 15, color: 'var(--orange)' }} />
                Load sample assessment
              </button>

              <button
                disabled={!pdfFile || !zipFile}
                onClick={simulateGradingProcess}
                className="btn-primary"
                style={{ fontSize: 13, padding: '13px 32px' }}
              >
                <Play style={{ width: 15, height: 15 }} />
                Start AI Grading Agent
              </button>
            </div>
          </div>
        )}

        {/* ===== PHASE 2: GRADING ===== */}
        {appState === 'grading' && (
          <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 16, maxWidth: 960, width: '100%', margin: '0 auto' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Loader2 style={{ width: 20, height: 20, color: 'var(--orange)' }} className="animate-spin" />
                  <h2 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: 'var(--brown)', letterSpacing: '-0.02em' }}>
                    Grading Pipeline
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: 'var(--brown-light)', opacity: 0.7, fontFamily: "'Space Mono', monospace" }}>
                  Synthesizing PDF parameters and testing code...
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="font-display" style={{ fontSize: 40, fontWeight: 800, color: 'var(--orange)', lineHeight: 1 }}>
                  {currentProgress}%
                </div>
                <p style={{ fontSize: 9, color: 'var(--brown-light)', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>PROGRESS</p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="progress-track" style={{ marginBottom: 28 }}>
              <div className="progress-fill" style={{ width: `${currentProgress}%` }} />
            </div>

            {/* MAIN CONTENT */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, flex: 1 }}>

              {/* STEP LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Pipeline Steps</p>
                {steps.map((step, i) => (
                  <div
                    key={step.id}
                    className={`step-item ${step.status}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {step.status === 'completed' && <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--green-accent)', flexShrink: 0 }} />}
                      {step.status === 'running' && <Loader2 style={{ width: 16, height: 16, color: 'var(--orange)', flexShrink: 0 }} className="animate-spin" />}
                      {step.status === 'pending' && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-dark)', flexShrink: 0 }} />}
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: step.status === 'running' ? 'var(--orange)' : 'var(--brown)', lineHeight: 1.3, fontFamily: "'Space Grotesk', sans-serif" }}>{step.label}</p>
                        <p style={{ fontSize: 9, color: 'var(--brown-light)', opacity: 0.6, marginTop: 2, fontFamily: "'Space Mono', monospace" }}>{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TERMINAL */}
              <div className="terminal-window" style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
                <div className="terminal-header">
                  <div className="terminal-dot" style={{ background: '#FF5F56' }} />
                  <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
                  <div className="terminal-dot" style={{ background: '#27C93F' }} />
                  <Terminal style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }} />
                  <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
                    g++ & ai-agent-sandbox — logs
                  </span>
                </div>
                <div className="terminal-body" style={{ flex: 1 }}>
                  {consoleLogs.map((log, idx) => {
                    let color = '#D4C5A9';
                    if (log.startsWith('[System]')) color = '#64B5F6';
                    else if (log.startsWith('[AI Agent]')) color = '#CE93D8';
                    else if (log.startsWith('[Compiler]')) color = '#FFD54F';
                    else if (log.includes('SUCCESS')) color = '#81C784';
                    else if (log.includes('FAILED') || log.includes('error:')) color = '#EF9A9A';
                    else if (log.includes('leak') || log.includes('Warning')) color = '#FFD54F';
                    return <div key={idx} style={{ color, wordBreak: 'break-word' }}>{log}</div>;
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: 'var(--orange)' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace" }}>$</span>
                    <span style={{ width: 6, height: 14, background: 'var(--orange)', display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />
                  </div>
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== PHASE 3: DASHBOARD ===== */}
        {appState === 'dashboard' && (
          <div className="animate-fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* SECTION TITLE */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 className="font-display" style={{ fontSize: 30, fontWeight: 800, color: 'var(--brown)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  Assessment Results
                </h2>
                <p style={{ fontSize: 12, color: 'var(--brown-light)', opacity: 0.7, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
                  {pdfFile?.name || 'Manual Template'} · {results.length} submissions evaluated
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <FileSpreadsheet style={{ width: 13, height: 13, color: 'var(--green-accent)' }} />
                  Export CSV
                </button>
                <button className="btn-secondary" onClick={handleExportText} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <Download style={{ width: 13, height: 13, color: 'var(--orange)' }} />
                  Scorecards
                </button>
              </div>
            </div>

            {/* STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div className="stat-card orange">
                <p style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 6 }}>Class Average</p>
                <p className="font-display" style={{ fontSize: 34, fontWeight: 800, color: 'var(--brown)', lineHeight: 1 }}>{averageScore}<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--brown-light)', opacity: 0.5 }}>%</span></p>
                <Award style={{ width: 18, height: 18, color: 'var(--orange)', marginTop: 8, opacity: 0.7 }} />
              </div>
              <div className="stat-card yellow">
                <p style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 6 }}>Submissions</p>
                <p className="font-display" style={{ fontSize: 34, fontWeight: 800, color: 'var(--brown)', lineHeight: 1 }}>{results.length}</p>
                <User style={{ width: 18, height: 18, color: '#B8960A', marginTop: 8, opacity: 0.7 }} />
              </div>
              <div className="stat-card green">
                <p style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 6 }}>Pass Rate</p>
                <p className="font-display" style={{ fontSize: 34, fontWeight: 800, color: 'var(--green-accent)', lineHeight: 1 }}>{passRate}<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--brown-light)', opacity: 0.5 }}>%</span></p>
                <CheckCircle style={{ width: 18, height: 18, color: 'var(--green-accent)', marginTop: 8, opacity: 0.7 }} />
              </div>
              <div className="stat-card red">
                <p style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 6 }}>Security Flags</p>
                <p className="font-display" style={{ fontSize: 34, fontWeight: 800, color: 'var(--red-accent)', lineHeight: 1 }}>{totalWarnings}</p>
                <ShieldAlert style={{ width: 18, height: 18, color: 'var(--red-accent)', marginTop: 8, opacity: 0.7 }} />
              </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18, flex: 1, minHeight: 500 }}>

              {/* LEFT: STUDENT LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* SEARCH */}
                <div className="paper-card" style={{ padding: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', opacity: 0.5 }} />
                    <input
                      type="text"
                      className="search-input"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search students..."
                    />
                  </div>
                  {/* FILTER PILLS */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {(['all', 'pass', 'warning', 'fail'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`filter-pill ${statusFilter === f ? `active-${f}` : ''}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LIST */}
                <div className="paper-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {filteredStudents.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: 'var(--brown-light)', opacity: 0.5 }}>
                        No submissions match query.
                      </div>
                    ) : filteredStudents.map(student => {
                      const isSelected = selectedStudent?.id === student.id;
                      return (
                        <div
                          key={student.id}
                          onClick={() => { setSelectedStudent(student); setExpandedAnnotations({}); }}
                          className={`student-row${isSelected ? ' selected' : ''}`}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown)', fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</p>
                            <p style={{ fontSize: 10, color: 'var(--brown-light)', opacity: 0.6, marginTop: 2, fontFamily: "'Space Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.filename}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span className="font-display" style={{
                              fontSize: 18, fontWeight: 800,
                              color: student.status === 'pass' ? 'var(--green-accent)' : student.status === 'warning' ? '#B8960A' : 'var(--red-accent)'
                            }}>
                              {student.score}
                            </span>
                            <ChevronRight style={{ width: 12, height: 12, color: isSelected ? 'var(--orange)' : 'var(--border-dark)', opacity: 0.7 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT: DETAIL PANEL */}
              <div>
                {selectedStudent ? (
                  <div className="paper-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* STUDENT BANNER */}
                    <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--border-dark)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 800, color: 'var(--brown)' }}>{selectedStudent.name}</h3>
                          <span className={`sticker ${selectedStudent.status === 'pass' ? 'sticker-green' : selectedStudent.status === 'warning' ? '' : 'sticker-red'}`}
                            style={selectedStudent.status === 'warning' ? { background: 'var(--yellow)', color: 'var(--brown)' } : {}}>
                            {selectedStudent.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--brown-light)', opacity: 0.6, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
                          {selectedStudent.filename}
                        </p>
                      </div>
                      {/* SCORE BADGE */}
                      <div className={`score-badge ${selectedStudent.status}`} style={{
                        boxShadow: `3px 3px 0 ${selectedStudent.status === 'pass' ? 'rgba(52,199,89,0.25)' : selectedStudent.status === 'warning' ? 'rgba(255,214,10,0.3)' : 'rgba(255,59,48,0.2)'}`,
                        padding: '8px 14px'
                      }}>
                        {selectedStudent.score}<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>/100</span>
                      </div>
                    </div>

                    {/* TABS */}
                    <div className="tab-nav" style={{ flexShrink: 0 }}>
                      {(['code', 'rubric', 'summary'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        >
                          {tab === 'code' && <><Code style={{ width: 12, height: 12, display: 'inline', marginRight: 5 }} />Code &amp; Reviews</>}
                          {tab === 'rubric' && <><Award style={{ width: 12, height: 12, display: 'inline', marginRight: 5 }} />Rubric</>}
                          {tab === 'summary' && <><Sparkles style={{ width: 12, height: 12, display: 'inline', marginRight: 5 }} />AI Summary</>}
                        </button>
                      ))}
                    </div>

                    {/* TAB CONTENT */}
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

                      {/* CODE TAB */}
                      {activeTab === 'code' && (
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, background: 'white' }}>
                          {selectedStudent.code.split('\n').map((lineText, idx) => {
                            const lineNum = idx + 1;
                            const annotation = selectedStudent.annotations.find(a => a.line === lineNum);
                            return (
                              <div key={lineNum}>
                                <div style={{
                                  display: 'flex', alignItems: 'flex-start',
                                  background: annotation
                                    ? annotation.type === 'error' ? 'rgba(255,59,48,0.04)'
                                    : annotation.type === 'warning' ? 'rgba(255,214,10,0.07)'
                                    : 'rgba(0,122,255,0.04)' : 'transparent'
                                }}>
                                  <span className="code-line-num">{lineNum}</span>
                                  <span className="code-line-content">{lineText || ' '}</span>
                                  {annotation && (
                                    <button
                                      onClick={() => toggleAnnotation(lineNum)}
                                      className="annotation-badge"
                                      style={{
                                        margin: '2px 10px 2px 0', flexShrink: 0, alignSelf: 'center',
                                        background: annotation.type === 'error' ? 'rgba(255,59,48,0.1)' : annotation.type === 'warning' ? 'rgba(255,214,10,0.2)' : 'rgba(0,122,255,0.1)',
                                        borderColor: annotation.type === 'error' ? 'var(--red-accent)' : annotation.type === 'warning' ? '#B8960A' : 'var(--blue-accent)',
                                        color: annotation.type === 'error' ? 'var(--red-accent)' : annotation.type === 'warning' ? '#7a5e00' : 'var(--blue-accent)',
                                      }}
                                    >
                                      {annotation.type === 'error' && <XCircle style={{ width: 9, height: 9 }} />}
                                      {annotation.type === 'warning' && <AlertCircle style={{ width: 9, height: 9 }} />}
                                      {annotation.type === 'info' && <HelpCircle style={{ width: 9, height: 9 }} />}
                                      AI {annotation.type}
                                    </button>
                                  )}
                                </div>
                                {annotation && (
                                  <div style={{
                                    margin: '0 0 0 36px',
                                    padding: '10px 16px',
                                    borderLeft: `3px solid ${annotation.type === 'error' ? 'var(--red-accent)' : annotation.type === 'warning' ? 'var(--yellow)' : 'var(--blue-accent)'}`,
                                    background: annotation.type === 'error' ? 'rgba(255,59,48,0.04)' : annotation.type === 'warning' ? 'rgba(255,214,10,0.08)' : 'rgba(0,122,255,0.05)',
                                    display: 'flex', alignItems: 'flex-start', gap: 10
                                  }}>
                                    <div style={{ marginTop: 2 }}>
                                      {annotation.type === 'error' && <XCircle style={{ width: 14, height: 14, color: 'var(--red-accent)' }} />}
                                      {annotation.type === 'warning' && <AlertCircle style={{ width: 14, height: 14, color: '#B8960A' }} />}
                                      {annotation.type === 'info' && <Sparkles style={{ width: 14, height: 14, color: 'var(--blue-accent)' }} />}
                                    </div>
                                    <div>
                                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'capitalize', color: 'var(--brown)', marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>
                                        {annotation.type} Recommendation
                                      </p>
                                      <p style={{ fontSize: 12, color: 'var(--brown-light)', lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif" }}>
                                        {annotation.message}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* RUBRIC TAB */}
                      {activeTab === 'rubric' && (
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brown-light)', marginBottom: 4 }}>Grading Criteria Breakdown</p>
                          {selectedStudent.rubricBreakdown.map((rub, idx) => {
                            const pct = Math.round((rub.score / rub.maxScore) * 100);
                            const barColor = pct >= 80 ? 'var(--green-accent)' : pct >= 50 ? 'var(--yellow)' : 'var(--red-accent)';
                            const textColor = pct >= 80 ? 'var(--green-accent)' : pct >= 50 ? '#7a5e00' : 'var(--red-accent)';
                            return (
                              <div key={idx} className="paper-card-cream paper-card" style={{ padding: '16px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                  <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--brown)' }}>{rub.name}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: textColor }}>{rub.score}/{rub.maxScore} pts</span>
                                </div>
                                <div className="rubric-bar-track" style={{ marginBottom: 10 }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width 0.5s ease' }} />
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--brown-light)', lineHeight: 1.6 }}>{rub.feedback}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* SUMMARY TAB */}
                      {activeTab === 'summary' && (
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div className="paper-card-yellow paper-card" style={{ padding: '18px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '2px solid rgba(180,150,0,0.2)' }}>
                              <Sparkles style={{ width: 16, height: 16, color: '#B8960A' }} />
                              <span className="font-display" style={{ fontWeight: 700, fontSize: 14, color: 'var(--brown)' }}>AI Evaluation Overview</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--brown)', lineHeight: 1.8 }}>
                              {selectedStudent.aiSummary}
                            </p>
                          </div>

                          <div className="paper-card" style={{ padding: '16px 20px', background: 'rgba(52,199,89,0.06)', borderColor: 'rgba(52,199,89,0.25)' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: 'var(--brown-light)', marginBottom: 8 }}>Security &amp; Integrity Scan:</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green-accent)', fontWeight: 700, fontSize: 13 }}>
                              <Check style={{ width: 15, height: 15 }} />
                              No plagiarism indices match. Original source code configuration.
                            </div>
                          </div>

                          <div className="paper-card-cream paper-card" style={{ padding: '16px 20px' }}>
                            <h5 className="font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>Next Steps for Student:</h5>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {[
                                'Review inline suggestions highlighted in the code explorer.',
                                'Eliminate manual heap allocations (new/delete) and transition to STL (RAII).',
                                'Format variables and layout using modern lint styling guidelines.',
                              ].map((item, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--brown-light)', lineHeight: 1.5 }}>
                                  <span style={{ minWidth: 20, height: 20, background: 'var(--orange)', color: 'white', borderRadius: 2, fontSize: 10, fontWeight: 800, fontFamily: "'Syne', sans-serif", display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="paper-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', minHeight: 300 }}>
                    <div style={{ width: 56, height: 56, background: 'var(--bg)', border: '2px solid var(--border-dark)', boxShadow: 'var(--shadow-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, marginBottom: 14 }}>
                      <Code style={{ width: 24, height: 24, color: 'var(--brown-light)', opacity: 0.4 }} />
                    </div>
                    <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>No Student Selected</p>
                    <p style={{ fontSize: 13, color: 'var(--brown-light)', opacity: 0.6 }}>Select a student from the sidebar to review their code and AI recommendations.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <div className="header-rule" />
      <footer style={{ background: 'white', borderTop: '2px solid rgba(61,44,30,0.1)', padding: '14px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'var(--brown-light)', opacity: 0.6 }}>
          <span>© {new Date().getFullYear()} SyntaxGrader. All rights reserved.</span>
          <span>Next.js · AI Assessment Demo · C++ Autograder</span>
        </div>
      </footer>
    </div>
  );
}
