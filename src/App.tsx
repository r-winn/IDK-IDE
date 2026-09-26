import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Activity, Bot, Check, ChevronDown, ChevronRight, CircleHelp, Code2, Database, FileCode2, Files, Folder, GitBranch, Github, Globe2, HardDrive, LayoutGrid, Menu, MessageSquare, Moon, PanelBottom, Play, Plus, Search, Send, Settings as SettingsIcon, ShieldCheck, Sparkles, Sun, TerminalSquare, X } from 'lucide-react';
import { streamChat } from './lib/ai';
import type { Message, Settings } from './types';

const starter = `import { createAgent } from '@nova/agent';\n\nconst agent = createAgent({\n  name: 'My Assistant',\n  model: 'local/llama-3.2',\n  instructions: 'Be precise and helpful.',\n  tools: ['files', 'terminal'],\n});\n\nconst result = await agent.run(\n  'Review this project and suggest improvements'\n);\n\nconsole.log(result);`;

const initialSettings: Settings = { provider: { name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2', apiKey: '' }, systemPrompt: 'You are an expert coding assistant. Be concise, safe, and explain changes before applying them.', temperature: .3, databaseEnabled: false, databaseUrl: '', confirmCommands: true };

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [activeRail, setActiveRail] = useState('files');
  const [code, setCode] = useState(starter);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => { try { return { ...initialSettings, ...JSON.parse(localStorage.getItem('nova-settings') || '{}') }; } catch { return initialSettings; } });
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'I’m ready. Ask me to explain, refactor, or build anything in this workspace.' }]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const local = useMemo(() => /localhost|127\.0\.0\.1/.test(settings.provider.baseUrl), [settings.provider.baseUrl]);

  const submit = async () => {
    const text = input.trim(); if (!text || busy) return;
    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]); setInput(''); setBusy(true);
    try {
      await streamChat(settings, history, token => setMessages(current => current.map((m, i) => i === current.length - 1 ? { ...m, content: m.content + token } : m)));
    } catch (error) {
      setMessages(current => current.map((m, i) => i === current.length - 1 ? { ...m, content: `Couldn’t reach ${settings.provider.name}. Open Settings and check the endpoint and model.\n\n${error instanceof Error ? error.message : 'Unknown error'}` } : m));
    } finally { setBusy(false); }
  };
  const saveSettings = () => { const safe = { ...settings, provider: { ...settings.provider, apiKey: '' } }; localStorage.setItem('nova-settings', JSON.stringify(safe)); setSettingsOpen(false); };

  return <div className="app-shell">
    <header className="titlebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={15}/></div><b>IDK</b><span className="edition">AI IDE</span></div>
      <div className="project-switch"><Folder size={14}/><span>personal-agent</span><ChevronDown size={13}/></div>
      <div className="title-actions"><button className="status-pill"><span className="status-dot"/>Connected</button><button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</button><button className="icon-btn"><Github size={17}/></button><button className="avatar">AR</button></div>
    </header>
    <main className="workspace">
      <nav className="activity-rail">
        <div>{[['files',Files],['search',Search],['git',GitBranch],['agents',Bot],['extensions',LayoutGrid]].map(([id,Icon]) => <button key={id as string} className={activeRail === id ? 'active' : ''} onClick={() => setActiveRail(id as string)}><Icon size={20}/></button>)}</div>
        <div><button><CircleHelp size={20}/></button><button onClick={() => setSettingsOpen(true)}><SettingsIcon size={20}/></button></div>
      </nav>
      <aside className="explorer">
        <div className="panel-title"><span>EXPLORER</span><div><Plus size={15}/><Menu size={15}/></div></div>
        <div className="section-label"><ChevronDown size={14}/> PERSONAL-AGENT</div>
        <div className="tree">
          <div><ChevronDown size={14}/><Folder size={15} className="folder"/> src</div>
          <div className="indent active-file"><FileCode2 size={15} className="ts"/> agent.ts</div>
          <div className="indent"><FileCode2 size={15} className="purple"/> tools.ts</div>
          <div><ChevronRight size={14}/><Folder size={15} className="folder"/> prompts</div>
          <div><ChevronRight size={14}/><Folder size={15} className="folder"/> memory</div>
          <div><FileCode2 size={15} className="yellow"/> package.json</div>
          <div><FileCode2 size={15}/> README.md</div>
        </div>
        <div className="outline"><div className="section-label"><ChevronRight size={14}/> OUTLINE</div><div className="section-label"><ChevronRight size={14}/> TIMELINE</div></div>
      </aside>
      <section className="center-pane">
        <div className="tabs"><div className="tab active"><FileCode2 size={14} className="ts"/>agent.ts <X size={13}/></div><button><Plus size={15}/></button><div className="editor-tools"><Play size={15}/><PanelBottom size={15}/></div></div>
        <div className="breadcrumb">src <ChevronRight size={13}/> <FileCode2 size={13}/> agent.ts <ChevronRight size={13}/> <span>agent</span></div>
        <div className={`editor ${bottomOpen ? 'with-terminal' : ''}`}><Editor value={code} onChange={v => setCode(v || '')} language="typescript" theme={theme === 'dark' ? 'vs-dark' : 'light'} options={{ minimap:{enabled:true}, fontSize:14, lineHeight:23, fontFamily:"'JetBrains Mono', 'SFMono-Regular', Consolas, monospace", padding:{top:16}, smoothScrolling:true, cursorSmoothCaretAnimation:'on', overviewRulerBorder:false, scrollBeyondLastLine:false }}/></div>
        <div className={`terminal ${bottomOpen ? '' : 'collapsed'}`}>
          <div className="terminal-head"><div><button className="active">TERMINAL</button><button>OUTPUT</button><button>PROBLEMS <span>0</span></button></div><div><Plus size={14}/><ChevronDown size={14}/><X size={14} onClick={() => setBottomOpen(false)}/></div></div>
          <div className="terminal-body"><p><span className="green">➜</span> <span className="cyan">personal-agent</span> <span className="purple-text">git:(main)</span> npm run dev</p><p className="muted">IDK agent runtime ready on http://localhost:3000</p><p><span className="green">➜</span> <span className="cyan">personal-agent</span> <span className="cursor-block"> </span></p></div>
        </div>
      </section>
      <aside className="ai-panel">
        <div className="ai-head"><div><div className="agent-icon"><Sparkles size={16}/></div><div><b>IDK Agent</b><span>{settings.provider.model}</span></div></div><button className="icon-btn"><Menu size={16}/></button></div>
        <div className="context-bar"><span><Code2 size={13}/> agent.ts</span><button><Plus size={14}/> Add context</button></div>
        <div className="messages">
          {messages.map((m,i) => <div key={i} className={`message ${m.role}`}>
            {m.role === 'assistant' && <div className="mini-avatar"><Sparkles size={12}/></div>}
            <div className="bubble">{m.content || <span className="typing"><i/><i/><i/></span>}</div>
          </div>)}
        </div>
        <div className="composer-wrap"><div className="composer"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();} }} placeholder="Ask IDK or type / for commands…"/><div className="composer-footer"><div><button><Plus size={16}/></button><button className="mode"><Bot size={14}/> Agent <ChevronDown size={12}/></button></div><button className="send" onClick={submit} disabled={!input.trim() || busy}><Send size={15}/></button></div></div><p className="disclaimer">Nova can make mistakes. Review generated code.</p></div>
      </aside>
    </main>
    <footer className="statusbar"><div><span><GitBranch size={12}/> main*</span><span><Check size={12}/> 0</span><span><Activity size={12}/> Ready</span></div><div><span>{local ? <HardDrive size={12}/> : <Globe2 size={12}/>} {local ? 'Local' : 'Cloud'}</span><span>TypeScript</span><span>Ln 8, Col 12</span><span>UTF-8</span></div></footer>
    {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head"><div><div className="settings-icon"><SettingsIcon size={19}/></div><div><h2>Nova Settings</h2><p>Configure your model, memory and permissions</p></div></div><button className="icon-btn" onClick={() => setSettingsOpen(false)}><X size={18}/></button></div>
      <div className="settings-layout"><nav><button className="active"><Sparkles size={16}/> AI Provider</button><button><Database size={16}/> Database</button><button><ShieldCheck size={16}/> Permissions</button></nav><div className="settings-content">
        <h3>AI provider</h3><p className="help">Connect any OpenAI-compatible cloud or local model.</p>
        <label>Provider name<input value={settings.provider.name} onChange={e=>setSettings({...settings,provider:{...settings.provider,name:e.target.value}})}/></label>
        <label>Base URL<input value={settings.provider.baseUrl} onChange={e=>setSettings({...settings,provider:{...settings.provider,baseUrl:e.target.value}})}/><small>Ollama: http://localhost:11434/v1 · LM Studio: http://localhost:1234/v1</small></label>
        <div className="field-row"><label>Model<input value={settings.provider.model} onChange={e=>setSettings({...settings,provider:{...settings.provider,model:e.target.value}})}/></label><label>API key<input type="password" placeholder="Not saved in browser" value={settings.provider.apiKey} onChange={e=>setSettings({...settings,provider:{...settings.provider,apiKey:e.target.value}})}/></label></div>
        <div className="divider"/><div className="toggle-row"><div><b>Project database</b><p>Enable long-term memory and indexed project context.</p></div><button className={`toggle ${settings.databaseEnabled?'on':''}`} onClick={()=>setSettings({...settings,databaseEnabled:!settings.databaseEnabled})}><i/></button></div>
        {settings.databaseEnabled && <label>Database URL<input placeholder="postgresql://… or sqlite://…" value={settings.databaseUrl} onChange={e=>setSettings({...settings,databaseUrl:e.target.value})}/></label>}
        <div className="toggle-row"><div><b>Confirm terminal commands</b><p>Ask before an agent runs a command.</p></div><button className={`toggle ${settings.confirmCommands?'on':''}`} onClick={()=>setSettings({...settings,confirmCommands:!settings.confirmCommands})}><i/></button></div>
      </div></div><div className="modal-footer"><button className="secondary" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="primary" onClick={saveSettings}>Save settings</button></div>
    </div></div>}
  </div>;
}
export default App;
