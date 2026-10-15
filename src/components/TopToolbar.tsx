import React from 'react';
import {
  SketchUpExtension,
  UnitSystem,
} from '../types/extension';
import {
  Download,
  Sparkles,
  HelpCircle,
  Terminal,
  Code,
  Layout,
  Layers,
  ChevronDown,
  Box,
  FileCheck,
} from 'lucide-react';

interface TopToolbarProps {
  extensions: SketchUpExtension[];
  currentExtension: SketchUpExtension;
  onSelectExtension: (ext: SketchUpExtension) => void;
  unit: UnitSystem;
  onUnitChange: (u: UnitSystem) => void;
  onExportRbz: () => void;
  onOpenAiModal: () => void;
  onOpenInstallGuide: () => void;
  showCodeInspector: boolean;
  onToggleCodeInspector: () => void;
  showConsole: boolean;
  onToggleConsole: () => void;
  isExporting: boolean;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  extensions,
  currentExtension,
  onSelectExtension,
  unit,
  onUnitChange,
  onExportRbz,
  onOpenAiModal,
  onOpenInstallGuide,
  showCodeInspector,
  onToggleCodeInspector,
  showConsole,
  onToggleConsole,
  isExporting,
}) => {
  return (
    <header className="h-12 bg-stone-950 border-b border-stone-800 px-3 flex items-center justify-between select-none text-xs z-30 shrink-0">
      {/* Left: Branding & Extension Dropdown */}
      <div className="flex items-center gap-3">
        {/* SketchUp Studio Logo Mark */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center font-black text-xs text-white shadow-sm shadow-red-950/60">
            SU
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-stone-100 tracking-tight text-xs block">
              SketchUp Extension Studio
            </span>
            <span className="text-[10px] text-stone-500 font-mono -mt-0.5 block">
              Ruby API &bull; HtmlDialog &bull; .RBZ Bundler
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-stone-800 mx-1 hidden sm:block" />

        {/* Extension Picker */}
        <div className="relative group">
          <div className="flex items-center gap-2 bg-stone-900 border border-stone-700/80 hover:border-amber-500/50 rounded-md px-2.5 py-1.5 cursor-pointer text-stone-200 transition-colors">
            <Box className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-medium text-xs max-w-[160px] md:max-w-[220px] truncate">
              {currentExtension.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          </div>

          {/* Dropdown Menu */}
          <div className="absolute left-0 top-full mt-1 w-72 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl py-1 hidden group-hover:block z-50">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-stone-500 border-b border-stone-800">
              Select or Load Extension ({extensions.length})
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {extensions.map((ext) => (
                <button
                  key={ext.id}
                  onClick={() => onSelectExtension(ext)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-stone-800 transition-colors ${
                    ext.id === currentExtension.id
                      ? 'bg-amber-600/10 text-amber-300 font-semibold'
                      : 'text-stone-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <div className="flex-1 truncate">
                    <span className="block text-xs truncate">{ext.name}</span>
                    <span className="block text-[10px] text-stone-500 font-mono">
                      {ext.category} &bull; v{ext.version}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Create with AI button */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 hover:border-amber-500/40 text-stone-300 hover:text-amber-300 transition-colors"
          title="Create a new custom extension using AI"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline font-medium">New AI Extension</span>
        </button>
      </div>

      {/* Right: View Toggles, Unit Selector, Export .RBZ, Guide */}
      <div className="flex items-center gap-2">
        {/* Unit Selector */}
        <div className="flex items-center bg-stone-900 border border-stone-800 rounded p-0.5 text-[11px] font-mono">
          {(['mm', 'cm', 'inch', 'feet'] as UnitSystem[]).map((u) => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                unit === u
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Code Inspector Toggle */}
        <button
          onClick={onToggleCodeInspector}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors border ${
            showCodeInspector
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 font-medium'
              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
          title="Toggle Extension Ruby &amp; HTML Source Code"
        >
          <Code className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Code &amp; Audit</span>
        </button>

        {/* Ruby Console Toggle */}
        <button
          onClick={onToggleConsole}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors border ${
            showConsole
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 font-medium'
              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
          title="Toggle Interactive Ruby Console"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Ruby Console</span>
        </button>

        {/* Install Guide Button */}
        <button
          onClick={onOpenInstallGuide}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
          title="Installation instructions for SketchUp"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install Guide</span>
        </button>

        {/* Primary Export .RBZ Button */}
        <button
          onClick={onExportRbz}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-all shadow-md shadow-red-950/50 cursor-pointer disabled:opacity-50"
          title="Bundle and download .rbz package ready for SketchUp Extension Manager"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export .RBZ</span>
        </button>
      </div>
    </header>
  );
};
