import React, { useState, useEffect } from 'react';
import { SketchUpExtension, ExtensionParameter } from '../types/extension';
import { Play, RotateCcw, Sliders, ExternalLink, Code, Check } from 'lucide-react';

interface HtmlDialogPreviewProps {
  extension: SketchUpExtension;
  paramValues: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  onExecuteRubyAction: (actionName: string, payload: any) => void;
  onResetParams: () => void;
}

export const HtmlDialogPreview: React.FC<HtmlDialogPreviewProps> = ({
  extension,
  paramValues,
  onParamChange,
  onExecuteRubyAction,
  onResetParams,
}) => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'source'>('interactive');
  const [copied, setCopied] = useState(false);

  // Group parameters by category
  const categories = Array.from(
    new Set(extension.parameters.map((p) => p.category || 'General'))
  );

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(extension.files.dialogHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border-r border-stone-800 text-stone-100 select-none">
      {/* Dialog Window Header (Mimics SketchUp Native OS Dialog) */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-950 border-b border-stone-800">
        <div className="flex items-center gap-2">
          {/* SketchUp Logo Diamond / Mark */}
          <div className="w-4 h-4 bg-red-600 rounded-sm flex items-center justify-center font-bold text-[9px] text-white">
            SU
          </div>
          <span className="text-xs font-semibold text-stone-200 truncate">
            {extension.name} &bull; UI::HtmlDialog
          </span>
        </div>

        {/* View Switcher: Interactive UI vs Source Code */}
        <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded p-0.5 text-[11px]">
          <button
            onClick={() => setActiveTab('interactive')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'interactive'
                ? 'bg-amber-600 text-white font-medium'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Live Dialog
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'source'
                ? 'bg-amber-600 text-white font-medium'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            HTML/CSS
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 text-xs custom-scrollbar">
        {activeTab === 'interactive' ? (
          <div className="space-y-4">
            {/* Header / Subtitle */}
            <div className="bg-stone-950/60 border border-stone-800/90 rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-stone-200 text-sm">{extension.name}</span>
                <span className="text-[10px] bg-stone-800 text-amber-400 font-mono px-1.5 py-0.5 rounded">
                  v{extension.version}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                {extension.description}
              </p>
            </div>

            {/* Categorized Parameter Inputs */}
            {categories.map((cat) => {
              const catParams = extension.parameters.filter(
                (p) => (p.category || 'General') === cat
              );
              return (
                <div
                  key={cat}
                  className="bg-stone-950/50 border border-stone-800/80 rounded-md p-3 space-y-2.5"
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-bold flex items-center justify-between">
                    <span>{cat}</span>
                    <span className="text-stone-600 font-normal">
                      {catParams.length} param{catParams.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {catParams.map((param) => {
                      const val = paramValues[param.key] ?? param.default;

                      if (param.type === 'boolean') {
                        return (
                          <label
                            key={param.key}
                            className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-stone-800/50 cursor-pointer text-stone-300"
                          >
                            <span className="text-xs">{param.label}</span>
                            <input
                              type="checkbox"
                              checked={Boolean(val)}
                              onChange={(e) => onParamChange(param.key, e.target.checked)}
                              className="accent-amber-500 w-4 h-4 cursor-pointer"
                            />
                          </label>
                        );
                      }

                      if (param.type === 'select') {
                        return (
                          <div key={param.key} className="flex items-center justify-between gap-2">
                            <label className="text-stone-300 text-xs truncate max-w-[150px]">
                              {param.label}
                            </label>
                            <select
                              value={String(val)}
                              onChange={(e) => onParamChange(param.key, e.target.value)}
                              className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500 max-w-[140px]"
                            >
                              {param.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      // Numeric slider + number input
                      return (
                        <div key={param.key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-stone-300 text-xs">{param.label}</label>
                            <div className="flex items-center gap-1 font-mono text-stone-200">
                              <input
                                type="number"
                                min={param.min}
                                max={param.max}
                                step={param.step || 1}
                                value={val}
                                onChange={(e) =>
                                  onParamChange(param.key, parseFloat(e.target.value) || 0)
                                }
                                className="w-16 bg-stone-900 border border-stone-700 rounded px-1.5 py-0.5 text-right text-xs focus:outline-none focus:border-amber-500 font-mono"
                              />
                              {param.unit && (
                                <span className="text-[10px] text-stone-500 w-6">
                                  {param.unit}
                                </span>
                              )}
                            </div>
                          </div>
                          {param.min !== undefined && param.max !== undefined && (
                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.step || 1}
                              value={Number(val)}
                              onChange={(e) =>
                                onParamChange(param.key, parseFloat(e.target.value))
                              }
                              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-800 rounded"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Simulated SketchUp Ruby Callback Trigger */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() =>
                  onExecuteRubyAction('buildGeometry', {
                    extensionId: extension.id,
                    params: paramValues,
                  })
                }
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-md font-semibold text-xs shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute in SketchUp Model</span>
              </button>

              <button
                onClick={onResetParams}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 rounded text-[11px] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Default Parameters</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-800">
              <span className="font-mono text-stone-400 text-[11px]">dialog.html & style.css</span>
              <button
                onClick={handleCopyHtml}
                className="flex items-center gap-1 px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy HTML'}</span>
              </button>
            </div>

            <div>
              <div className="text-[10px] font-mono text-amber-400 mb-1">HTML Template:</div>
              <pre className="bg-stone-950 p-2.5 rounded border border-stone-800 font-mono text-[10px] text-stone-300 overflow-x-auto whitespace-pre leading-tight">
                {extension.files.dialogHtml}
              </pre>
            </div>

            <div>
              <div className="text-[10px] font-mono text-amber-400 mb-1">CSS Stylesheet:</div>
              <pre className="bg-stone-950 p-2.5 rounded border border-stone-800 font-mono text-[10px] text-stone-300 overflow-x-auto whitespace-pre leading-tight">
                {extension.files.dialogCss}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-[10px] text-stone-500 font-mono">
        <span>Bridge: sketchup.actionName(json)</span>
        <span className="text-emerald-400">Connected</span>
      </div>
    </div>
  );
};
