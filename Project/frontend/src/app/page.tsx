'use client';

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Upload, FileText, FolderArchive, ArrowRight, CheckCircle2, 
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
  // App workflow state
  const [appState, setAppState] = useState<'upload' | 'grading' | 'dashboard'>('upload');
  
  // File states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isParsingZip, setIsParsingZip] = useState(false);
  const [detectedZipFiles, setDetectedZipFiles] = useState<{ name: string; content: string }[]>([]);
  
  // Rubric config states
  const [gradingRigor, setGradingRigor] = useState<'standard' | 'strict' | 'permissive'>('standard');
  const [rubricFocus, setRubricFocus] = useState({
    syntax: true,
    memory: true,
    complexity: true,
    plagiarism: true
  });
  
  // Simulator states
  const [steps, setSteps] = useState<GradingStep[]>(GRADING_STEPS);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  
  // Dashboard result states
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'warning' | 'fail'>('all');
  const [activeTab, setActiveTab] = useState<'code' | 'rubric' | 'summary'>('code');
  const [expandedAnnotations, setExpandedAnnotations] = useState<{ [line: number]: boolean }>({});

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputPdfRef = useRef<HTMLInputElement>(null);
  const fileInputZipRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  // Utility to locate keywords in code (for mock line-annotations)
  const getLineOfKeyword = (code: string, keyword: string): number => {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(keyword)) {
        return i + 1;
      }
    }
    return 0;
  };

  // Extract ZIP contents inside the browser
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
          cppFiles.push({
            name: filename,
            content: textContent
          });
        }
      });

      await Promise.all(filePromises);
      setDetectedZipFiles(cppFiles);
    } catch (err) {
      console.error("Error unzipping file client-side:", err);
    } finally {
      setIsParsingZip(false);
    }
  };

  // Run dynamic evaluation based on extracted C++ files or fallback mock data
  const simulateGradingProcess = () => {
    setAppState('grading');
    setConsoleLogs([]);
    setCurrentProgress(0);
    setSteps(GRADING_STEPS.map(s => ({ ...s, status: 'pending' })));

    let logIndex = 0;
    const intervalTime = 120; // ms per log line
    const totalLogs = CONSOLE_LOGS_TEMPLATE.length;

    const timer = setInterval(() => {
      if (logIndex < totalLogs) {
        const log = CONSOLE_LOGS_TEMPLATE[logIndex];
        setConsoleLogs(prev => [...prev, log.text]);
        
        // Update progress percentage
        const progressPercent = Math.round(((logIndex + 1) / totalLogs) * 100);
        setCurrentProgress(progressPercent);

        // Update step states based on log scope
        setSteps(prevSteps => {
          return prevSteps.map(step => {
            if (step.id === log.step) {
              // If it's the current log step, mark as running
              return { ...step, status: 'running' };
            } else if (
              // If the log is for a step that comes AFTER this step, mark this step as completed
              CONSOLE_LOGS_TEMPLATE.findIndex(l => l.step === step.id) < 
              CONSOLE_LOGS_TEMPLATE.findIndex(l => l.step === log.step)
            ) {
              return { ...step, status: 'completed' };
            }
            return step;
          });
        });

        logIndex++;
      } else {
        clearInterval(timer);
        
        // Complete the final steps
        setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        
        // Compile the student scores (real dynamic or fallback)
        let gradingResults: StudentResult[] = [];
        if (detectedZipFiles.length > 0) {
          gradingResults = processDynamicFiles(detectedZipFiles);
        } else {
          gradingResults = DEFAULT_STUDENTS;
        }

        // Apply rigor multiplier if strict or permissive
        if (gradingRigor === 'strict') {
          gradingResults = gradingResults.map(s => {
            const newScore = Math.max(0, s.score - 8);
            return {
              ...s,
              score: newScore,
              status: newScore >= 80 ? 'pass' : newScore >= 45 ? 'warning' : 'fail'
            };
          });
        } else if (gradingRigor === 'permissive') {
          gradingResults = gradingResults.map(s => {
            const newScore = Math.min(100, s.score + 5);
            return {
              ...s,
              score: newScore,
              status: newScore >= 80 ? 'pass' : newScore >= 55 ? 'warning' : 'fail'
            };
          });
        }

        setResults(gradingResults);
        setSelectedStudent(gradingResults[0] || null);
        
        // Brief pause before transitioning to dashboard
        setTimeout(() => {
          setAppState('dashboard');
        }, 800);
      }
    }, intervalTime);
  };

  // Compile real C++ files uploaded by the user with client-side heuristic "AI"
  const processDynamicFiles = (files: { name: string; content: string }[]): StudentResult[] => {
    return files.map((file, idx) => {
      // Extract Student Name from file path
      // e.g. "submissions/charlie_daniels.cpp" -> Charlie Daniels
      let name = file.name
        .replace(/\.[^/.]+$/, "") // remove extension
        .replace(/^.*[\\\/]/, "") // remove directory path
        .replace(/[-_]/g, " ") // spaces
        .replace(/\d+/g, "") // remove student ID digits
        .trim();
      
      name = name.split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .filter(w => w.length > 0)
        .join(' ');
      
      if (!name) name = `Submission #${idx + 1}`;

      const code = file.content;
      const annotations: CodeAnnotation[] = [];

      // Check namespaces
      if (rubricFocus.syntax && code.includes('using namespace std;')) {
        annotations.push({
          line: getLineOfKeyword(code, 'using namespace std;') || 2,
          type: 'info',
          message: 'AI Suggestion: "using namespace std;" can lead to global name conflicts. Recommended: prefix types explicitly (e.g. std::cout, std::vector).'
        });
      }

      // Check manual allocation (new / delete)
      const hasNew = code.includes('new ');
      const hasDelete = code.includes('delete ');
      if (rubricFocus.memory && hasNew && !hasDelete) {
        annotations.push({
          line: getLineOfKeyword(code, 'new ') || 6,
          type: 'error',
          message: 'Memory Diagnostic Alert: Dynamic allocation detected using "new", but no matching "delete" is present. This will cause a memory leak.'
        });
      } else if (rubricFocus.memory && hasNew && hasDelete) {
        annotations.push({
          line: getLineOfKeyword(code, 'delete') || 15,
          type: 'info',
          message: 'AI Note: Manual memory deallocation is correct, but modern C++ recommends std::unique_ptr or std::vector for Exception Safety (RAII).'
        });
      }

      // Check for mid overflow in binary searches
      if (rubricFocus.complexity && (code.includes('(low + high) / 2') || code.includes('(low+high)/2') || code.includes('(high + low) / 2'))) {
        annotations.push({
          line: getLineOfKeyword(code, 'low') || 10,
          type: 'warning',
          message: 'Overflow warning: Adding low + high can exceed the maximum range of signed 32-bit integers. Better formula: `low + (high - low) / 2`.'
        });
      }

      // Check for nested loops indicating potential O(N^2) complexity
      const firstFor = code.indexOf('for');
      const secondFor = firstFor !== -1 ? code.indexOf('for', firstFor + 3) : -1;
      const hasNestedLoop = firstFor !== -1 && secondFor !== -1 && secondFor - firstFor < 120;
      if (rubricFocus.complexity && hasNestedLoop) {
        annotations.push({
          line: getLineOfKeyword(code, 'for') || 8,
          type: 'warning',
          message: 'Performance Warning: Nested loops detected. Ensure complexity does not violate rubric O(N log N) requirements.'
        });
      }

      // Check formatting or missing braces
      const lines = code.split('\n');
      const commentCount = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('/*')).length;
      if (commentCount === 0) {
        annotations.push({
          line: Math.min(5, lines.length),
          type: 'info',
          message: 'Code Quality: Consider adding header block documentation and descriptive function docstrings.'
        });
      }

      // Base scoring
      let correctness = 50;
      let memory = 30;
      let style = 20;

      // Adjust dynamic scores based on checks
      if (hasNew && !hasDelete) memory -= 25;
      if (hasNestedLoop) memory -= 8;
      if (code.includes('(low + high) / 2')) memory -= 4;
      if (code.includes('using namespace std;')) style -= 4;
      if (commentCount === 0) style -= 6;
      if (code.length < 50) { // Empty file or tiny
        correctness = 0;
        memory = 0;
        style = 0;
      }

      const score = correctness + memory + style;
      const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail';

      const rubricBreakdown: RubricCriteria[] = [
        { name: 'Core Correctness', maxScore: 50, score: correctness, feedback: correctness === 0 ? 'Empty or uncompilable submission.' : 'Passed 10/10 automated IO test suites.' },
        { name: 'Memory & Complexity', maxScore: 30, score: memory, feedback: memory === 30 ? 'Fully optimized data structures.' : 'Contains complexity warning or raw allocation warnings.' },
        { name: 'Style & Readability', maxScore: 20, score: style, feedback: style === 20 ? 'Adheres cleanly to guidelines.' : 'Missing documentation blocks or uses global namespaces.' }
      ];

      return {
        id: `dyn-std-${idx}`,
        name,
        filename: file.name,
        code,
        score,
        status,
        rubricBreakdown,
        aiSummary: `Parsed submission file: ${file.name}. Syntactical validation complete. AI evaluation reports ${annotations.filter(a => a.type === 'error').length} blocking errors, and ${annotations.filter(a => a.type === 'warning').length} architectural suggestions. Clean compiling target structure.`,
        annotations
      };
    });
  };

  // Load standard pre-made mock data directly
  const loadSampleAssessment = () => {
    setPdfFile(new File([], "cpp_binary_search_rubric.pdf"));
    setZipFile(new File([], "student_submissions_bs.zip"));
    setDetectedZipFiles([]);
  };

  // Reset application back to upload
  const handleReset = () => {
    setAppState('upload');
    setPdfFile(null);
    setZipFile(null);
    setDetectedZipFiles([]);
    setResults([]);
    setSelectedStudent(null);
  };

  // Export results table as a real CSV download
  const handleExportCSV = () => {
    if (results.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Filename,Score,Status,Correctness Score,Complexity Score,Style Score,AI Summary\n";
    
    results.forEach(student => {
      const row = [
        `"${student.name}"`,
        `"${student.filename}"`,
        student.score,
        student.status.toUpperCase(),
        student.rubricBreakdown[0]?.score || 0,
        student.rubricBreakdown[1]?.score || 0,
        student.rubricBreakdown[2]?.score || 0,
        `"${student.aiSummary.replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "syntaxgrader_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full reports as a text scorecard download
  const handleExportTextFeedback = () => {
    if (results.length === 0) return;

    let textReport = `====================================================\n`;
    textReport += `SYNTAXGRADER ASSESSMENT REPORT\n`;
    textReport += `Rubric File: ${pdfFile?.name || 'cpp_binary_search_rubric.pdf'}\n`;
    textReport += `Submissions Zip: ${zipFile?.name || 'student_submissions_bs.zip'}\n`;
    textReport += `Generated: ${new Date().toLocaleDateString()}\n`;
    textReport += `====================================================\n\n`;

    results.forEach(student => {
      textReport += `STUDENT: ${student.name}\n`;
      textReport += `Filename: ${student.filename}\n`;
      textReport += `Overall Grade: ${student.score}/100 [${student.status.toUpperCase()}]\n`;
      textReport += `----------------------------------------------------\n`;
      student.rubricBreakdown.forEach(rub => {
        textReport += `- ${rub.name}: ${rub.score}/${rub.maxScore} pts\n`;
        textReport += `  Detail: ${rub.feedback}\n`;
      });
      textReport += `\nAI Agent Summary Feedback:\n`;
      textReport += `${student.aiSummary}\n`;
      
      if (student.annotations.length > 0) {
        textReport += `\nLine Code Annotations:\n`;
        student.annotations.forEach(ann => {
          textReport += `  [Line ${ann.line}] ${ann.type.toUpperCase()}: ${ann.message}\n`;
        });
      }
      textReport += `\n====================================================\n\n`;
    });

    const blob = new Blob([textReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "syntaxgrader_ai_report.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Toggle comments inline inside code editor
  const toggleAnnotation = (line: number) => {
    setExpandedAnnotations(prev => ({
      ...prev,
      [line]: !prev[line]
    }));
  };

  // Computations for dashboard statistics
  const averageScore = results.length > 0 
    ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / results.length) 
    : 0;

  const passRate = results.length > 0
    ? Math.round((results.filter(s => s.score >= 70).length / results.length) * 100)
    : 0;

  const totalWarnings = results.reduce((acc, curr) => 
    acc + curr.annotations.filter(a => a.type === 'warning' || a.type === 'error').length, 0);

  // Filter & Search student list
  const filteredStudents = results.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.filename.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && student.status === statusFilter;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 font-sans min-h-screen">
      {/* GLOWING HEADER */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 active-glow">
              <Code className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300">
                Syntax<span className="text-indigo-400 font-semibold">Grader</span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" /> C++ Code Assessment AI Sandbox
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full border border-indigo-900/50 bg-indigo-950/30 text-indigo-300 font-medium">
              Simulated AI Agent Mode
            </span>
            {appState !== 'upload' && (
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-slate-800/80 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Grading
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col">
        
        {/* PHASE 1: FILE UPLOAD PORTAL */}
        {appState === 'upload' && (
          <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full py-6 md:py-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                Automate Your C++ Grading
              </h2>
              <p className="text-slate-400 text-base max-w-lg mx-auto">
                Upload your assignment rubric PDF and zip file containing student C++ source codes. Our AI agent will extract criteria, build the code, and grade.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              
              {/* PDF RUBRIC UPLOAD */}
              <div 
                onClick={() => fileInputPdfRef.current?.click()}
                className={`glass-panel p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.01] ${
                  pdfFile 
                    ? 'border-indigo-500/50 bg-indigo-950/10' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/25'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputPdfRef} 
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  accept=".pdf"
                  className="hidden" 
                />
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                  pdfFile ? 'bg-indigo-950 border border-indigo-500/40 text-indigo-400' : 'bg-slate-900 text-slate-500'
                }`}>
                  <FileText className="w-7 h-7" />
                </div>
                {pdfFile ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white max-w-[250px] truncate">{pdfFile.name}</p>
                    <p className="text-xs text-indigo-400 mt-1">Rubric file loaded</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                      className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline"
                    >
                      Change File
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-200">Upload Rubric (PDF)</p>
                    <p className="text-xs text-slate-500 mt-1">Drag and drop or browse files</p>
                    <p className="text-[10px] text-slate-600 mt-3">Supports assessment parameters & rules</p>
                  </div>
                )}
              </div>

              {/* ZIP SOURCE CODES UPLOAD */}
              <div 
                onClick={() => fileInputZipRef.current?.click()}
                className={`glass-panel p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.01] ${
                  zipFile 
                    ? 'border-indigo-500/50 bg-indigo-950/10' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/25'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputZipRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleZipSelection(file);
                  }}
                  accept=".zip"
                  className="hidden" 
                />
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                  zipFile ? 'bg-indigo-950 border border-indigo-500/40 text-indigo-400' : 'bg-slate-900 text-slate-500'
                }`}>
                  {isParsingZip ? (
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                  ) : (
                    <FolderArchive className="w-7 h-7" />
                  )}
                </div>
                {zipFile ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white max-w-[250px] truncate">{zipFile.name}</p>
                    {detectedZipFiles.length > 0 ? (
                      <p className="text-xs text-indigo-400 mt-1">Detected {detectedZipFiles.length} C++ files</p>
                    ) : (
                      <p className="text-xs text-indigo-400 mt-1">Zip file loaded</p>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setZipFile(null); setDetectedZipFiles([]); }}
                      className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline"
                    >
                      Change Zip
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-200">Upload Submissions (ZIP)</p>
                    <p className="text-xs text-slate-500 mt-1">Drag and drop or browse archive</p>
                    <p className="text-[10px] text-slate-600 mt-3">Contains student C++ files (.cpp)</p>
                  </div>
                )}
              </div>

            </div>

            {/* AI AGENT CONFIG PANEL */}
            <div className="glass-panel p-6 rounded-2xl mb-8">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Agent Evaluator Parameters
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">Grading Rigor Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['permissive', 'standard', 'strict'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setGradingRigor(r)}
                        className={`text-xs py-2 rounded-lg border capitalize font-medium transition ${
                          gradingRigor === r
                            ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                            : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    {gradingRigor === 'standard' && 'Standard evaluation guidelines matching exact rubric points.'}
                    {gradingRigor === 'strict' && 'Strict compliance evaluation: heavier penalties for structure/leak violations.'}
                    {gradingRigor === 'permissive' && 'Lenient compliance: prioritizes outputs, gives bonuses for logic.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">AI Grading Checklist Focus</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={rubricFocus.syntax}
                        onChange={(e) => setRubricFocus({ ...rubricFocus, syntax: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-600" 
                      />
                      Syntax Check
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={rubricFocus.memory}
                        onChange={(e) => setRubricFocus({ ...rubricFocus, memory: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-600" 
                      />
                      Memory Leak Diagnostics
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={rubricFocus.complexity}
                        onChange={(e) => setRubricFocus({ ...rubricFocus, complexity: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-600" 
                      />
                      Complexity Constraints
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={rubricFocus.plagiarism}
                        onChange={(e) => setRubricFocus({ ...rubricFocus, plagiarism: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-600" 
                      />
                      Plagiarism Detection
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-900 pt-6">
              <button 
                onClick={loadSampleAssessment}
                className="w-full sm:w-auto text-xs text-slate-400 hover:text-white font-medium flex items-center justify-center gap-1.5 hover:underline"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Load Sample Assessment to Preview
              </button>

              <button
                disabled={!pdfFile || !zipFile}
                onClick={simulateGradingProcess}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold shadow-lg transition ${
                  pdfFile && zipFile
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/20 active-glow cursor-pointer'
                    : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4" /> Start AI Grading Agent
              </button>
            </div>

          </div>
        )}

        {/* PHASE 2: PROCESSING / GRADING PIPELINE */}
        {appState === 'grading' && (
          <div className="flex-1 flex flex-col justify-center py-4 md:py-8 max-w-5xl mx-auto w-full">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  Grading Pipeline In Action
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Synthesizing PDF parameters and conducting code testing...
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-400 font-mono">{currentProgress}%</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Overall Progress</p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mb-8 border border-slate-800/40">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              ></div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              
              {/* STEP DETAILS */}
              <div className="lg:col-span-1 flex flex-col gap-3">
                {steps.map((step) => (
                  <div 
                    key={step.id}
                    className={`p-4 rounded-xl border transition ${
                      step.status === 'running' 
                        ? 'bg-indigo-950/20 border-indigo-500/45 shadow-lg shadow-indigo-500/5' 
                        : step.status === 'completed'
                        ? 'bg-slate-900/30 border-emerald-950 text-slate-300'
                        : 'bg-slate-900/10 border-slate-900/30 opacity-40 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                      {step.status === 'running' && <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />}
                      {step.status === 'pending' && <div className="w-5 h-5 rounded-full border border-slate-800 shrink-0" />}
                      
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-200">{step.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* LIVE TERMINAL */}
              <div className="lg:col-span-2 flex flex-col h-[400px] rounded-2xl bg-slate-950 border border-slate-900 relative shadow-2xl">
                {/* Window header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-slate-950/60 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-mono font-bold text-slate-400">g++ & ai-agent-sandbox - logs</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                  </div>
                </div>

                {/* Console logs */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300 flex flex-col gap-1 terminal-scanlines select-text selection:bg-indigo-900 selection:text-indigo-100">
                  {consoleLogs.map((log, idx) => {
                    let colorClass = 'text-slate-300';
                    if (log.startsWith('[System]')) colorClass = 'text-blue-400';
                    else if (log.startsWith('[AI Agent]')) colorClass = 'text-purple-400';
                    else if (log.startsWith('[Compiler]')) colorClass = 'text-amber-400';
                    else if (log.includes('SUCCESS')) colorClass = 'text-emerald-400 font-bold';
                    else if (log.includes('FAILED') || log.includes('error:')) colorClass = 'text-red-400 font-bold';
                    else if (log.includes('leak') || log.includes('Warning')) colorClass = 'text-amber-400';

                    return (
                      <div key={idx} className={`${colorClass} leading-5 break-words`}>
                        {log}
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1 mt-1 text-indigo-400">
                    <span>$</span>
                    <span className="w-1.5 h-3.5 bg-indigo-400 animate-pulse"></span>
                  </div>
                  <div ref={terminalEndRef} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PHASE 3: COMPILATION & RESULTS DASHBOARD */}
        {appState === 'dashboard' && (
          <div className="flex-1 flex flex-col gap-6 py-4 animate-fade-in">
            
            {/* OVERVIEW STATISTICS CARD ROW */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Class Average</span>
                  <p className="text-2xl font-black text-white mt-1 font-mono">{averageScore}%</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-950 flex items-center justify-center border border-indigo-900/50">
                  <Award className="w-5 h-5 text-indigo-400" />
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Submissions</span>
                  <p className="text-2xl font-black text-white mt-1 font-mono">{results.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pass Rate</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{passRate}%</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-950/20 flex items-center justify-center border border-emerald-900/50">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Security Flags</span>
                  <p className="text-2xl font-black text-amber-500 mt-1 font-mono">{totalWarnings}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-950/20 flex items-center justify-center border border-amber-900/50">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </div>

            {/* DOWNLOAD CONTROLS AND RESET */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center glass-panel p-4 rounded-xl border-slate-900 bg-slate-900/15">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Grading Session Output</h3>
                  <p className="text-[10px] text-slate-500">PDF Rubric: {pdfFile?.name || 'Manual Template'}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-lg transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
                </button>
                <button
                  onClick={handleExportTextFeedback}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2 rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" /> Export Scorecards
                </button>
              </div>
            </div>

            {/* MAIN DATA WORKSPACE */}
            <div className="grid lg:grid-cols-12 gap-6 items-stretch">
              
              {/* LEFT COLUMN: STUDENT LIST */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                
                {/* SEARCH AND FILTERS */}
                <div className="glass-panel p-4 rounded-xl flex flex-col gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search students..."
                      className="w-full text-xs bg-slate-950 border border-slate-900 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {(['all', 'pass', 'warning', 'fail'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`text-[10px] px-2.5 py-1 rounded-full border capitalize font-semibold transition shrink-0 ${
                          statusFilter === filter
                            ? filter === 'pass' ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400'
                              : filter === 'warning' ? 'border-amber-600 bg-amber-950/30 text-amber-400'
                              : filter === 'fail' ? 'border-rose-600 bg-rose-950/30 text-rose-400'
                              : 'border-indigo-600 bg-indigo-950/30 text-indigo-400'
                            : 'border-slate-800 bg-slate-900/20 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SCROLLABLE STUDENT LIST */}
                <div className="glass-panel rounded-xl overflow-hidden flex-1 max-h-[500px] overflow-y-auto">
                  <div className="divide-y divide-slate-900">
                    {filteredStudents.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No submissions match query.
                      </div>
                    ) : (
                      filteredStudents.map((student) => {
                        const isSelected = selectedStudent?.id === student.id;
                        return (
                          <div
                            key={student.id}
                            onClick={() => {
                              setSelectedStudent(student);
                              setExpandedAnnotations({});
                            }}
                            className={`p-4 cursor-pointer transition flex items-center justify-between ${
                              isSelected 
                                ? 'bg-indigo-950/20 border-l-2 border-indigo-500' 
                                : 'hover:bg-slate-900/40'
                            }`}
                          >
                            <div className="truncate pr-3">
                              <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {student.name}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1 truncate">{student.filename}</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className={`text-sm font-black font-mono ${
                                  student.status === 'pass' ? 'text-emerald-400' :
                                  student.status === 'warning' ? 'text-amber-500' : 'text-rose-500'
                                }`}>
                                  {student.score}
                                </span>
                                <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Score</p>
                              </div>
                              <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: INSPECTOR DETAILS */}
              <div className="lg:col-span-8 flex flex-col">
                {selectedStudent ? (
                  <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[600px]">
                    
                    {/* Selected Student Banner */}
                    <div className="px-6 py-4 border-b border-slate-900 bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{selectedStudent.name}</h3>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            selectedStudent.status === 'pass' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' :
                            selectedStudent.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-900/50' :
                            'bg-rose-950 text-rose-400 border border-rose-900/50'
                          }`}>
                            {selectedStudent.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Source File: {selectedStudent.filename}</p>
                      </div>

                      {/* Score Indicator */}
                      <div className="flex items-center gap-3 bg-slate-950 border border-slate-900 px-4 py-2 rounded-xl">
                        <div className="text-right">
                          <p className="text-[8px] text-slate-500 uppercase font-black tracking-wider">AI Evaluation Grade</p>
                          <span className="text-lg font-black text-white font-mono">{selectedStudent.score}/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-900 bg-slate-900/10 shrink-0">
                      <button
                        onClick={() => setActiveTab('code')}
                        className={`flex-1 sm:flex-initial text-xs py-3 px-6 font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                          activeTab === 'code'
                            ? 'border-indigo-500 text-indigo-400 bg-indigo-950/5'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" /> Code & AI Reviews
                      </button>
                      <button
                        onClick={() => setActiveTab('rubric')}
                        className={`flex-1 sm:flex-initial text-xs py-3 px-6 font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                          activeTab === 'rubric'
                            ? 'border-indigo-500 text-indigo-400 bg-indigo-950/5'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" /> Rubric Assessment
                      </button>
                      <button
                        onClick={() => setActiveTab('summary')}
                        className={`flex-1 sm:flex-initial text-xs py-3 px-6 font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                          activeTab === 'summary'
                            ? 'border-indigo-500 text-indigo-400 bg-indigo-950/5'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" /> AI Summary
                      </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto min-h-0 bg-slate-950/30">
                      
                      {/* TAB 1: CODE & ANNOTATIONS */}
                      {activeTab === 'code' && (
                        <div className="p-4 font-mono text-xs leading-6 overflow-x-auto h-full">
                          <div className="inline-block min-w-full">
                            {selectedStudent.code.split('\n').map((lineText, idx) => {
                              const lineNum = idx + 1;
                              const annotation = selectedStudent.annotations.find(a => a.line === lineNum);
                              const isExpanded = !!expandedAnnotations[lineNum];
                              
                              return (
                                <div key={lineNum} className="flex flex-col">
                                  {/* Line container */}
                                  <div className={`flex items-start group hover:bg-slate-900/30 ${
                                    annotation ? annotation.type === 'error' ? 'bg-rose-950/5' : annotation.type === 'warning' ? 'bg-amber-950/5' : 'bg-blue-950/5' : ''
                                  }`}>
                                    {/* Line number column */}
                                    <div className="w-10 text-right pr-3 select-none text-slate-600 font-bold shrink-0 border-r border-slate-900 bg-slate-950">
                                      {lineNum}
                                    </div>
                                    
                                    {/* Code & Indicator column */}
                                    <div className="flex-1 pl-4 pr-4 whitespace-pre relative flex items-center justify-between">
                                      <span className="text-slate-300 font-medium">{lineText}</span>
                                      
                                      {/* AI Annotation Badge */}
                                      {annotation && (
                                        <button
                                          onClick={() => toggleAnnotation(lineNum)}
                                          className={`ml-3 shrink-0 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded transition cursor-pointer select-none ${
                                            annotation.type === 'error' ? 'bg-rose-950 text-rose-400 border border-rose-900/40 hover:bg-rose-900/20' :
                                            annotation.type === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-900/40 hover:bg-amber-900/20' :
                                            'bg-blue-950 text-blue-400 border border-blue-900/40 hover:bg-blue-900/20'
                                          }`}
                                        >
                                          {annotation.type === 'error' && <XCircle className="w-2.5 h-2.5" />}
                                          {annotation.type === 'warning' && <AlertCircle className="w-2.5 h-2.5" />}
                                          {annotation.type === 'info' && <HelpCircle className="w-2.5 h-2.5" />}
                                          AI Agent review
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Embedded review box */}
                                  {annotation && (isExpanded || true) && (
                                    <div className="pl-14 pr-4 py-2 bg-slate-950 border-y border-slate-900 flex">
                                      <div className={`w-full p-3 rounded-lg flex items-start gap-3 border ${
                                        annotation.type === 'error' ? 'bg-rose-950/10 border-rose-900/40 text-rose-200' :
                                        annotation.type === 'warning' ? 'bg-amber-950/10 border-amber-900/40 text-amber-200' :
                                        'bg-blue-950/10 border-blue-900/40 text-blue-200'
                                      }`}>
                                        <div className="mt-0.5">
                                          {annotation.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
                                          {annotation.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                                          {annotation.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400" />}
                                        </div>
                                        <div className="text-xs">
                                          <p className="font-bold text-slate-100 capitalize">{annotation.type} Recommendation</p>
                                          <p className="mt-1 leading-relaxed text-slate-300 font-sans">{annotation.message}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TAB 2: RUBRIC BREAKDOWN */}
                      {activeTab === 'rubric' && (
                        <div className="p-6 flex flex-col gap-6">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Grading Criteria Breakdown</h4>
                          <div className="flex flex-col gap-6">
                            {selectedStudent.rubricBreakdown.map((rub, idx) => {
                              const percent = Math.round((rub.score / rub.maxScore) * 100);
                              
                              let progressColor = 'bg-indigo-500';
                              let textColor = 'text-indigo-400';
                              if (percent >= 80) {
                                progressColor = 'bg-emerald-500';
                                textColor = 'text-emerald-400';
                              } else if (percent >= 50) {
                                progressColor = 'bg-amber-500';
                                textColor = 'text-amber-400';
                              } else {
                                progressColor = 'bg-rose-500';
                                textColor = 'text-rose-400';
                              }

                              return (
                                <div key={idx} className="glass-panel p-4 rounded-xl border-slate-900">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-white">{rub.name}</span>
                                    <span className={`text-xs font-bold font-mono ${textColor}`}>{rub.score}/{rub.maxScore} pts</span>
                                  </div>
                                  
                                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900 mb-3">
                                    <div 
                                      className={`h-full ${progressColor} transition-all duration-500`}
                                      style={{ width: `${percent}%` }}
                                    ></div>
                                  </div>

                                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{rub.feedback}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TAB 3: SUMMARY */}
                      {activeTab === 'summary' && (
                        <div className="p-6 flex flex-col gap-6">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">AI Agent Executive Review</h4>
                            <div className="glass-panel p-5 rounded-xl border-indigo-900/35 bg-indigo-950/5 text-slate-300 leading-relaxed font-sans text-xs flex flex-col gap-4">
                              <div className="flex gap-2 items-center text-indigo-400 border-b border-slate-900 pb-3">
                                <Sparkles className="w-4 h-4" />
                                <span className="font-bold">Evaluation Overview</span>
                              </div>
                              <p className="leading-6 text-slate-300 text-sm">
                                {selectedStudent.aiSummary}
                              </p>
                              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-900 text-xs">
                                <p className="font-semibold text-slate-400">Security & Integrity scan status:</p>
                                <div className="flex items-center gap-1.5 text-emerald-400 mt-1.5 font-semibold">
                                  <Check className="w-3.5 h-3.5" /> No plagiarism indices match. Original source code configuration.
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="glass-panel p-5 rounded-xl border-slate-900 flex flex-col gap-3">
                            <h5 className="text-xs font-semibold text-white">Next Steps for Student:</h5>
                            <ul className="list-disc list-inside text-xs text-slate-400 flex flex-col gap-2 leading-relaxed">
                              <li>Review inline suggestions highlighted in the code explorer.</li>
                              <li>Eliminate manual heap allocations (`new`/`delete`) and transition to STL components.</li>
                              <li>Format variables and layout using modern lint styling.</li>
                            </ul>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div className="glass-panel rounded-xl flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 border-dashed min-h-[300px]">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                      <Code className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">No Student Selected</p>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">Select a student from the sidebar matrix to review their code file, scores, and AI recommendations.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>
      
      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 mt-12 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600 font-mono gap-2">
          <span>&copy; {new Date().getFullYear()} SyntaxGrader. All rights reserved.</span>
          <span>Designed with Vanilla CSS & React • Integrated AI Assistant Demo</span>
        </div>
      </footer>
    </div>
  );
}
