import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, CornerDownLeft, Sparkles, HelpCircle } from 'lucide-react';
import { SketchUpExtension } from '../types/extension';

interface ConsoleMessage {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: string;
}

interface RubyConsoleProps {
  extension: SketchUpExtension;
  customLogs?: string[];
  onTriggerAction?: (action: string) => void;
}

export const RubyConsole: React.FC<RubyConsoleProps> = ({
  extension,
  customLogs = [],
  onTriggerAction,
}) => {
  const [messages, setMessages] = useState<ConsoleMessage[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'Trimble SketchUp Pro Ruby Console (Ruby 3.2.2 x86_64-linux)',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'init-2',
      type: 'system',
      text: `Loaded extension: ${extension.name} v${extension.version} [${extension.id}]`,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'init-3',
      type: 'output',
      text: 'Type Sketchup.version or help for simulated commands.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Sync external logs
  useEffect(() => {
    if (customLogs.length > 0) {
      const latest = customLogs[customLogs.length - 1];
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'output',
          text: latest,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, [customLogs]);

  const executeRuby = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    // Add to history
    setHistory((prev) => [trimmed, ...prev]);
    setHistoryIndex(-1);

    const now = new Date().toLocaleTimeString();
    const newMsgs: ConsoleMessage[] = [
      { id: Math.random().toString(), type: 'input', text: trimmed, timestamp: now },
    ];

    // Simulated Ruby Engine Evaluation
    const lower = trimmed.toLowerCase();

    if (lower === 'help') {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: `Available SketchUp Ruby API commands:
- Sketchup.version
- Sketchup.active_model
- Sketchup.active_model.entities.count
- Sketchup.active_model.materials
- Sketchup.active_model.start_operation("Action", true)
- Sketchup.active_model.commit_operation
- UI.messagebox("text")
- load "${extension.id}/main.rb"
- clear`,
        timestamp: now,
      });
    } else if (lower === 'clear' || lower === 'cls') {
      setMessages([]);
      setInputVal('');
      return;
    } else if (lower.includes('sketchup.version')) {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: '=> "24.0.553"',
        timestamp: now,
      });
    } else if (lower.includes('sketchup.active_model.entities.count')) {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: '=> 84 entities in active context',
        timestamp: now,
      });
    } else if (lower.includes('sketchup.active_model.materials')) {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: '=> [#<Sketchup::Material "Oak Wood">, #<Sketchup::Material "Steel Pole">, #<Sketchup::Material "Clear Glass">]',
        timestamp: now,
      });
    } else if (lower.includes('sketchup.active_model')) {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: '=> #<Sketchup::Model:0x000001ae4f708 "Untitled.skp">',
        timestamp: now,
      });
    } else if (lower.startsWith('load ') || lower.startsWith('require ')) {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: `=> true (Successfully reloaded ${trimmed.replace(/load|require/g, '').trim()})`,
        timestamp: now,
      });
    } else if (lower.includes('ui.messagebox')) {
      const match = trimmed.match(/["'](.*?)["']/);
      const msg = match ? match[1] : 'Alert';
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: `[SketchUp Native Dialog]: "${msg}" -> MB_OK`,
        timestamp: now,
      });
    } else if (lower.includes('start_operation')) {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: '=> true (Pushed undo stack checkpoint)',
        timestamp: now,
      });
    } else if (lower.includes('commit_operation')) {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: '=> true (Committed undo record to SketchUp Edit menu)',
        timestamp: now,
      });
    } else {
      newMsgs.push({
        id: Math.random().toString(),
        type: 'output',
        text: `=> [Ruby Result]: Evaluated "${trimmed}" successfully.`,
        timestamp: now,
      });
    }

    setMessages((prev) => [...prev, ...newMsgs]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeRuby(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  const runPresetSnippet = (snippet: string) => {
    executeRuby(snippet);
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 font-mono text-xs border-t border-stone-800 select-none">
      {/* Console Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-stone-900 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-stone-300 text-[11px]">Ruby Console</span>
          <span className="text-[10px] text-stone-500">| SketchUp Pro 2024+ API</span>
        </div>

        {/* Quick Snippets */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => runPresetSnippet(`load "${extension.id}/main.rb"`)}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] transition-colors"
            title="Simulate reloading extension in Ruby console"
          >
            Reload Extension
          </button>
          <button
            onClick={() => runPresetSnippet('Sketchup.active_model.entities.count')}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] transition-colors"
          >
            Entities Count
          </button>
          <button
            onClick={() => runPresetSnippet('help')}
            className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Help & Commands"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMessages([])}
            className="p-1 rounded bg-stone-800 hover:bg-rose-950 hover:text-rose-400 text-stone-400 transition-colors"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Output Feed */}
      <div
        ref={scrollRef}
        className="flex-1 p-2.5 overflow-y-auto space-y-1 text-[11px] leading-relaxed custom-scrollbar bg-stone-950"
      >
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-1.5">
            {m.type === 'input' && (
              <span className="text-amber-400 font-bold select-none">&gt;&nbsp;</span>
            )}
            {m.type === 'output' && (
              <span className="text-stone-500 select-none">&nbsp;&nbsp;</span>
            )}
            {m.type === 'system' && (
              <span className="text-sky-500 select-none">#&nbsp;</span>
            )}
            {m.type === 'error' && (
              <span className="text-rose-500 font-bold select-none">!&nbsp;</span>
            )}

            <pre
              className={`flex-1 whitespace-pre-wrap font-mono break-all ${
                m.type === 'input'
                  ? 'text-amber-200 font-semibold'
                  : m.type === 'system'
                  ? 'text-sky-400/80 italic'
                  : m.type === 'error'
                  ? 'text-rose-400'
                  : 'text-stone-300'
              }`}
            >
              {m.text}
            </pre>
            <span className="text-[9px] text-stone-600 select-none self-start">
              {m.timestamp}
            </span>
          </div>
        ))}
      </div>

      {/* Input Prompt Row */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 border-t border-stone-800">
        <span className="text-amber-400 font-bold font-mono">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type SketchUp Ruby command (e.g. Sketchup.version, help, load...)"
          className="flex-1 bg-transparent border-none outline-none text-stone-100 font-mono text-xs placeholder:text-stone-600"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={() => executeRuby(inputVal)}
          className="p-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 transition-colors"
          title="Run Command"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
