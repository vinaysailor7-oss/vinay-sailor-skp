/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PRESET_EXTENSIONS } from './data/presetExtensions';
import {
  SketchUpExtension,
  UnitSystem,
  ExtensionFileSet,
} from './types/extension';
import { createRbzPackage, triggerFileDownload } from './utils/rbzPackager';
import { TopToolbar } from './components/TopToolbar';
import { SketchUpViewport } from './components/SketchUpViewport';
import { HtmlDialogPreview } from './components/HtmlDialogPreview';
import { CodeInspector } from './components/CodeInspector';
import { RubyConsole } from './components/RubyConsole';
import { InstallGuideModal } from './components/InstallGuideModal';
import { AiExtensionModal } from './components/AiExtensionModal';
import {
  Check,
  AlertCircle,
  Download,
  Terminal,
  Maximize2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export default function App() {
  const [extensions, setExtensions] = useState<SketchUpExtension[]>(PRESET_EXTENSIONS);
  const [currentExtension, setCurrentExtension] = useState<SketchUpExtension>(
    PRESET_EXTENSIONS[0]
  );
  const [unit, setUnit] = useState<UnitSystem>('mm');

  // Parameter values for currently active extension
  const [paramValues, setParamValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    PRESET_EXTENSIONS[0].parameters.forEach((p) => {
      initial[p.key] = p.default;
    });
    return initial;
  });

  // UI Panels visibility
  const [showCodeInspector, setShowCodeInspector] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [consoleHeight, setConsoleHeight] = useState(170); // in pixels
  const [showAiModal, setShowAiModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Live log stream for Ruby console
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[Kernel]: Initialized extension environment for ${PRESET_EXTENSIONS[0].name}`,
  ]);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(
    null
  );

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  // Switch Active Extension
  const handleSelectExtension = useCallback((ext: SketchUpExtension) => {
    setCurrentExtension(ext);
    const initialParams: Record<string, any> = {};
    ext.parameters.forEach((p) => {
      initialParams[p.key] = p.default;
    });
    setParamValues(initialParams);
    setConsoleLogs((prev) => [
      ...prev,
      `[Sketchup.register_extension]: Loaded "${ext.name}" v${ext.version} successfully.`,
    ]);
  }, []);

  // Update a single parameter value
  const handleParamChange = useCallback((key: string, value: any) => {
    setParamValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset default parameters
  const handleResetParams = useCallback(() => {
    const defaults: Record<string, any> = {};
    currentExtension.parameters.forEach((p) => {
      defaults[p.key] = p.default;
    });
    setParamValues(defaults);
    showToast(`Parameters reset to defaults for ${currentExtension.name}`, 'info');
  }, [currentExtension, showToast]);

  // Simulated Ruby action execution from HtmlDialog
  const handleExecuteRubyAction = useCallback(
    (actionName: string, payload: any) => {
      const now = new Date().toLocaleTimeString();
      setConsoleLogs((prev) => [
        ...prev,
        `[HtmlDialog Callback]: action="${actionName}" params=${JSON.stringify(
          paramValues
        )} at ${now}`,
        `=> Model operation completed: 1 group inserted into active context.`,
      ]);
      showToast(`Executed in SketchUp model: ${currentExtension.name}`);
    },
    [paramValues, currentExtension, showToast]
  );

  // Export current extension as .RBZ
  const handleExportRbz = useCallback(async () => {
    try {
      setIsExporting(true);
      const blob = await createRbzPackage(currentExtension);
      const filename = `${currentExtension.id}.rbz`;
      triggerFileDownload(blob, filename);

      showToast(
        `Downloaded ${filename}! Open SketchUp > Extensions > Extension Manager to install.`,
        'success'
      );
      setConsoleLogs((prev) => [
        ...prev,
        `[RBZ Packager]: Generated valid ZIP package "${filename}" (${Math.round(
          blob.size / 1024
        )} KB)`,
      ]);
    } catch (err: any) {
      showToast(`Failed to package .rbz: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  }, [currentExtension, showToast]);

  // Download individual file
  const handleDownloadFile = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerFileDownload(blob, filename);
  }, []);

  // Edit file in Code Inspector
  const handleUpdateFile = useCallback(
    (fileKey: keyof ExtensionFileSet, newContent: string) => {
      setCurrentExtension((prev) => ({
        ...prev,
        files: {
          ...prev.files,
          [fileKey]: newContent,
        },
      }));
      setExtensions((prev) =>
        prev.map((ext) =>
          ext.id === currentExtension.id
            ? {
                ...ext,
                files: {
                  ...ext.files,
                  [fileKey]: newContent,
                },
              }
            : ext
        )
      );
    },
    [currentExtension.id]
  );

  // New Extension Created via AI
  const handleExtensionCreated = useCallback(
    (newExt: SketchUpExtension) => {
      setExtensions((prev) => [newExt, ...prev]);
      handleSelectExtension(newExt);
      showToast(`Extension "${newExt.name}" created and loaded!`, 'success');
      setShowCodeInspector(true);
    },
    [handleSelectExtension, showToast]
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExportRbz();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowConsole((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowAiModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExportRbz]);

  return (
    <div className="flex flex-col h-screen w-screen bg-stone-950 text-stone-100 overflow-hidden font-sans">
      {/* Top Application Toolbar */}
      <TopToolbar
        extensions={extensions}
        currentExtension={currentExtension}
        onSelectExtension={handleSelectExtension}
        unit={unit}
        onUnitChange={setUnit}
        onExportRbz={handleExportRbz}
        onOpenAiModal={() => setShowAiModal(true)}
        onOpenInstallGuide={() => setShowInstallModal(true)}
        showCodeInspector={showCodeInspector}
        onToggleCodeInspector={() => setShowCodeInspector(!showCodeInspector)}
        showConsole={showConsole}
        onToggleConsole={() => setShowConsole(!showConsole)}
        isExporting={isExporting}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: SketchUp Extension HtmlDialog Window */}
        <aside className="w-80 md:w-96 shrink-0 h-full z-10">
          <HtmlDialogPreview
            extension={currentExtension}
            paramValues={paramValues}
            onParamChange={handleParamChange}
            onExecuteRubyAction={handleExecuteRubyAction}
            onResetParams={handleResetParams}
          />
        </aside>

        {/* Center Panel: Interactive 3D SketchUp Viewport & Ruby Console */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* 3D Viewport */}
          <div className="flex-1 relative overflow-hidden">
            <SketchUpViewport
              extension={currentExtension}
              paramValues={paramValues}
              onConsoleLog={(msg) => setConsoleLogs((prev) => [...prev, msg])}
              unit={unit}
            />
          </div>

          {/* Bottom Docked Ruby Console */}
          {showConsole && (
            <div
              style={{ height: `${consoleHeight}px` }}
              className="relative shrink-0 border-t border-stone-800 transition-all duration-150"
            >
              <RubyConsole
                extension={currentExtension}
                customLogs={consoleLogs}
                onTriggerAction={(action) => handleExecuteRubyAction(action, {})}
              />
            </div>
          )}
        </main>

        {/* Right Panel: Code Inspector & Ruby API Validator (Collapsible) */}
        {showCodeInspector && (
          <aside className="w-96 lg:w-[480px] shrink-0 h-full z-10">
            <CodeInspector
              extension={currentExtension}
              onUpdateFile={handleUpdateFile}
              onDownloadFile={handleDownloadFile}
            />
          </aside>
        )}
      </div>

      {/* Modals */}
      <InstallGuideModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        extensionName={currentExtension.name}
        extensionId={currentExtension.id}
      />

      <AiExtensionModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onExtensionCreated={handleExtensionCreated}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-stone-900 border border-stone-700 shadow-2xl text-xs font-medium text-stone-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
