import React, { useState } from 'react';
import {
  X,
  Download,
  FolderOpen,
  Terminal,
  Layers,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensionName: string;
  extensionId: string;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  extensionName,
  extensionId,
}) => {
  const [activeTab, setActiveTab] = useState<'manager' | 'manual' | 'debugging'>('manager');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(key);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const winPath = `%APPDATA%\\SketchUp\\SketchUp 2024\\SketchUp\\Plugins`;
  const macPath = `~/Library/Application Support/SketchUp 2024/SketchUp/Plugins`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="bg-stone-900 border border-stone-700/80 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center font-bold text-xs text-white">
              SU
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-100">
                How to Install Your Extension in Trimble SketchUp
              </h2>
              <p className="text-xs text-stone-400">
                Instructions for SketchUp Pro / Make 2017 &ndash; 2026+
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/50 px-5 pt-2 text-xs">
          <button
            onClick={() => setActiveTab('manager')}
            className={`pb-2.5 px-3 font-medium transition-colors border-b-2 ${
              activeTab === 'manager'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            1-Click Install (.RBZ via Extension Manager)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-2.5 px-3 font-medium transition-colors border-b-2 ${
              activeTab === 'manual'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Manual Plugins Folder
          </button>
          <button
            onClick={() => setActiveTab('debugging')}
            className={`pb-2.5 px-3 font-medium transition-colors border-b-2 ${
              activeTab === 'debugging'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Ruby Console & Live Reload
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed custom-scrollbar text-stone-300">
          {activeTab === 'manager' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 flex items-start gap-2.5">
                <Download className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  First, click <strong>"Export .RBZ"</strong> in the top bar to download the package file (e.g. <code>{extensionId}.rbz</code>).
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-stone-800 border border-stone-700 text-stone-200 font-mono text-center leading-5 shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-100 text-sm">Open Extension Manager</h4>
                    <p className="text-stone-400 mt-0.5">
                      In SketchUp, go to the top menu bar:
                      <br />
                      &bull; In SketchUp 2021+: <strong>Extensions &gt; Extension Manager</strong>
                      <br />
                      &bull; In SketchUp 2017&ndash;2020: <strong>Window &gt; Extension Manager</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-stone-800 border border-stone-700 text-stone-200 font-mono text-center leading-5 shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-100 text-sm">Click "Install Extension"</h4>
                    <p className="text-stone-400 mt-0.5">
                      At the bottom of the Extension Manager dialog window, click the red/blue <strong>Install Extension</strong> button.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-stone-800 border border-stone-700 text-stone-200 font-mono text-center leading-5 shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-100 text-sm">Select your downloaded .rbz</h4>
                    <p className="text-stone-400 mt-0.5">
                      Navigate to your Downloads folder and choose <code>{extensionId}.rbz</code>. SketchUp will unpack it into your Plugins directory automatically!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-stone-800 border border-stone-700 text-stone-200 font-mono text-center leading-5 shrink-0 font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-100 text-sm">Use your Extension</h4>
                    <p className="text-stone-400 mt-0.5">
                      Your extension is now active! Find it under <strong>Extensions &gt; {extensionName}</strong> or check your toolbars (<strong>View &gt; Toolbars</strong>).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-4">
              <p>
                An <code>.rbz</code> file is simply a standard <code>.zip</code> file with an extension rename. You can extract it directly into SketchUp's Plugins directory:
              </p>

              <div className="space-y-3">
                <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                      Windows Plugins Directory
                    </span>
                    <button
                      onClick={() => copyText(winPath, 'win')}
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                    >
                      {copiedPath === 'win' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPath === 'win' ? 'Copied' : 'Copy Path'}</span>
                    </button>
                  </div>
                  <code className="text-[11px] text-stone-400 font-mono break-all">{winPath}</code>
                </div>

                <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                      macOS Plugins Directory
                    </span>
                    <button
                      onClick={() => copyText(macPath, 'mac')}
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                    >
                      {copiedPath === 'mac' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPath === 'mac' ? 'Copied' : 'Copy Path'}</span>
                    </button>
                  </div>
                  <code className="text-[11px] text-stone-400 font-mono break-all">{macPath}</code>
                </div>

                <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-[11px] text-stone-400 space-y-1">
                  <p className="font-semibold text-stone-200">Inside the Plugins folder, ensure:</p>
                  <p>&bull; <code>{extensionId}.rb</code> is in the root of the Plugins directory.</p>
                  <p>&bull; <code>{extensionId}/</code> subfolder contains <code>main.rb</code>, <code>dialog.html</code>, etc.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debugging' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-stone-100 text-sm">
                How to Live-Reload While Developing
              </h4>
              <p>
                When you make changes to your Ruby scripts in SketchUp, you don't need to restart SketchUp!
              </p>

              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-2">
                <span className="text-stone-400 text-xs block">
                  1. Open the Ruby Console in SketchUp via <strong>Window &gt; Ruby Console</strong>.
                </span>
                <span className="text-stone-400 text-xs block">
                  2. Type this command to reload your code instantaneously:
                </span>
                <div className="flex items-center justify-between bg-stone-900 p-2 rounded border border-stone-800 font-mono text-amber-400">
                  <span>load '{extensionId}/main.rb'</span>
                  <button
                    onClick={() => copyText(`load '${extensionId}/main.rb'`, 'cmd')}
                    className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200"
                  >
                    {copiedPath === 'cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-1 text-stone-400 text-[11px]">
                <p className="font-semibold text-stone-200">Inspect HtmlDialog Chromium DevTools:</p>
                <p>
                  To right-click and "Inspect Element" inside your SketchUp HtmlDialog, set this in the Ruby Console before opening your dialog:
                </p>
                <code className="text-amber-400 font-mono block mt-1">
                  ENV['SKETCHUP_DEBUG'] = '1'
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-md font-medium text-xs transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
