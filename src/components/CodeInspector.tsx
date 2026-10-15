import React, { useState, useMemo } from 'react';
import {
  SketchUpExtension,
  ExtensionFileSet,
} from '../types/extension';
import {
  validateSketchUpRubyCode,
  ExtensionValidationReport,
} from '../utils/rubyValidator';
import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Download,
  ShieldCheck,
  FileText,
  Code2,
} from 'lucide-react';

interface CodeInspectorProps {
  extension: SketchUpExtension;
  onUpdateFile: (fileKey: keyof ExtensionFileSet, newContent: string) => void;
  onDownloadFile: (filename: string, content: string) => void;
}

type FileTab = 'registrar' | 'main' | 'html' | 'js' | 'css' | 'readme' | 'validator';

export const CodeInspector: React.FC<CodeInspectorProps> = ({
  extension,
  onUpdateFile,
  onDownloadFile,
}) => {
  const [activeTab, setActiveTab] = useState<FileTab>('main');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Run validation
  const validationReport = useMemo(() => {
    return validateSketchUpRubyCode(
      extension.files.registrarRb,
      extension.files.mainRb
    );
  }, [extension.files.registrarRb, extension.files.mainRb]);

  // Determine current active file details
  const currentFile = useMemo(() => {
    switch (activeTab) {
      case 'registrar':
        return {
          filename: `${extension.id}.rb`,
          language: 'ruby',
          content: extension.files.registrarRb,
          fileKey: 'registrarRb' as keyof ExtensionFileSet,
          description: 'Root extension registrar loader placed directly in Plugins folder',
        };
      case 'main':
        return {
          filename: `${extension.id}/main.rb`,
          language: 'ruby',
          content: extension.files.mainRb,
          fileKey: 'mainRb' as keyof ExtensionFileSet,
          description: 'Primary Ruby logic, menus, toolbars, and geometry operations',
        };
      case 'html':
        return {
          filename: `${extension.id}/dialog.html`,
          language: 'html',
          content: extension.files.dialogHtml,
          fileKey: 'dialogHtml' as keyof ExtensionFileSet,
          description: 'UI::HtmlDialog layout structure and form controls',
        };
      case 'js':
        return {
          filename: `${extension.id}/dialog.js`,
          language: 'javascript',
          content: extension.files.dialogJs,
          fileKey: 'dialogJs' as keyof ExtensionFileSet,
          description: 'JavaScript bridge communicating with SketchUp via sketchup.callAction()',
        };
      case 'css':
        return {
          filename: `${extension.id}/style.css`,
          language: 'css',
          content: extension.files.dialogCss,
          fileKey: 'dialogCss' as keyof ExtensionFileSet,
          description: 'Styling for the Chromium embedded HtmlDialog UI',
        };
      case 'readme':
        return {
          filename: `${extension.id}/README.md`,
          language: 'markdown',
          content: extension.files.readmeMd || '# Documentation',
          fileKey: 'readmeMd' as keyof ExtensionFileSet,
          description: 'Installation and usage documentation for Trimble SketchUp',
        };
      default:
        return null;
    }
  }, [activeTab, extension]);

  const handleCopy = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentFile) return;
    onDownloadFile(currentFile.filename, currentFile.content);
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border-l border-stone-800 text-stone-200 select-none">
      {/* File Tabs Navigation */}
      <div className="flex items-center justify-between px-2 pt-2 bg-stone-950 border-b border-stone-800 overflow-x-auto text-xs custom-scrollbar">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('registrar')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t font-mono text-[11px] transition-colors ${
              activeTab === 'registrar'
                ? 'bg-stone-900 text-amber-400 border-t-2 border-amber-500 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-rose-400" />
            <span>{extension.id}.rb</span>
          </button>

          <button
            onClick={() => setActiveTab('main')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t font-mono text-[11px] transition-colors ${
              activeTab === 'main'
                ? 'bg-stone-900 text-amber-400 border-t-2 border-amber-500 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-rose-400" />
            <span>main.rb</span>
          </button>

          <button
            onClick={() => setActiveTab('html')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t font-mono text-[11px] transition-colors ${
              activeTab === 'html'
                ? 'bg-stone-900 text-amber-400 border-t-2 border-amber-500 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-orange-400" />
            <span>dialog.html</span>
          </button>

          <button
            onClick={() => setActiveTab('js')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t font-mono text-[11px] transition-colors ${
              activeTab === 'js'
                ? 'bg-stone-900 text-amber-400 border-t-2 border-amber-500 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>dialog.js</span>
          </button>

          <button
            onClick={() => setActiveTab('css')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t font-mono text-[11px] transition-colors ${
              activeTab === 'css'
                ? 'bg-stone-900 text-amber-400 border-t-2 border-amber-500 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>style.css</span>
          </button>

          <button
            onClick={() => setActiveTab('readme')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t font-mono text-[11px] transition-colors ${
              activeTab === 'readme'
                ? 'bg-stone-900 text-amber-400 border-t-2 border-amber-500 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>README.md</span>
          </button>
        </div>

        {/* Ruby API Compliance Validator Tab */}
        <button
          onClick={() => setActiveTab('validator')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t font-mono text-[11px] transition-colors border-l border-stone-800 ${
            activeTab === 'validator'
              ? 'bg-stone-900 text-emerald-400 border-t-2 border-emerald-500 font-semibold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>API Audit ({validationReport.overallScore}%)</span>
        </button>
      </div>

      {/* Toolbar / Header */}
      {currentFile && activeTab !== 'validator' && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-stone-900 border-b border-stone-800 text-[11px]">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono text-stone-300 font-semibold">
              {currentFile.filename}
            </span>
            <span className="text-stone-500 text-[10px] hidden sm:inline">
              &bull; {currentFile.description}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                isEditing
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {isEditing ? 'Editing...' : 'Edit Code'}
            </button>
            <button
              onClick={handleCopy}
              className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
              title="Copy file code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
              title="Download individual file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Code Editor or Validator View */}
      <div className="flex-1 overflow-auto bg-stone-950 font-mono text-xs custom-scrollbar">
        {activeTab === 'validator' ? (
          /* SketchUp API Guidelines Compliance Report */
          <div className="p-4 space-y-4 max-w-3xl">
            <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  SketchUp Ruby API Best-Practice Audit
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Validates against official Trimble SketchUp Developer guidelines for extension stability, undo stack, and namespace collision prevention.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {validationReport.overallScore}%
                </span>
                <span className="block text-[10px] text-stone-500 font-mono">
                  COMPLIANCE SCORE
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {validationReport.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-stone-900/60 border border-stone-800/80 rounded-md p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-200 text-xs flex items-center gap-2">
                      {rule.status === 'pass' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {rule.status === 'warning' && (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                      {rule.status === 'error' && (
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      )}
                      {rule.status === 'info' && (
                        <Info className="w-4 h-4 text-sky-400" />
                      )}
                      {rule.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        rule.status === 'pass'
                          ? 'bg-emerald-950 text-emerald-300'
                          : rule.status === 'warning'
                          ? 'bg-amber-950 text-amber-300'
                          : rule.status === 'error'
                          ? 'bg-rose-950 text-rose-300'
                          : 'bg-sky-950 text-sky-300'
                      }`}
                    >
                      {rule.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 pl-6 leading-relaxed">
                    {rule.message}
                  </p>
                  {rule.recommendation && (
                    <div className="ml-6 p-2 bg-stone-950 rounded border border-amber-900/40 text-[10px] text-amber-300 font-mono">
                      Fix: {rule.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Syntax Code Display / Direct Editor */
          <div className="h-full flex flex-col">
            {isEditing ? (
              <textarea
                value={currentFile?.content || ''}
                onChange={(e) => {
                  if (currentFile) {
                    onUpdateFile(currentFile.fileKey, e.target.value);
                  }
                }}
                className="w-full h-full bg-stone-950 text-stone-200 p-4 font-mono text-xs leading-relaxed outline-none resize-none selection:bg-amber-500 selection:text-stone-950 border-none"
                spellCheck={false}
              />
            ) : (
              <div className="p-4 flex">
                {/* Line Numbers */}
                <div className="select-none text-stone-600 text-right pr-4 font-mono text-xs leading-relaxed border-r border-stone-800">
                  {currentFile?.content.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* Code Content */}
                <pre className="pl-4 flex-1 font-mono text-xs text-stone-200 leading-relaxed overflow-x-auto whitespace-pre selection:bg-amber-500 selection:text-stone-950">
                  {currentFile?.content}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
