import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Activity, Bot, Check, ChevronDown, ChevronRight, CircleHelp, CloudDownload, Code2, Database, FileCode2, Files, Folder, GitBranch, Github, Globe2, HardDrive, LayoutGrid, Menu, PanelBottom, Play, Plus, RefreshCw, RotateCcw, Search, Send, Settings as SettingsIcon, ShieldCheck, X } from 'lucide-react';
import { discoverModels, streamChat, testConnection } from './lib/ai';
import { downloadNativeUpdate, findNativeUpdate, installNativeUpdate, isDesktopApp, type NativeUpdate } from './lib/updater';
import { APP_VERSION } from './version';
import type { Message, Settings } from './types';

const starter = `import { createAgent } from '@nova/agent';\n\nconst agent = createAgent({\n  name: 'My Assistant',\n  model: 'local/llama-3.2',\n  instructions: 'Be precise and helpful.',\n  tools: ['files', 'terminal'],\n});\n\nconst result = await agent.run(\n  'Review this project and suggest improvements'\n);\n\nconsole.log(result);`;

const initialSettings: Settings = { provider: { name: 'Ollama Local', baseUrl: 'http://localhost:11434/v1', model: '', apiKey: '' }, systemPrompt: 'You are an expert coding assistant. Be concise, safe, and explain changes before applying them.', temperature: .3, theme: 'system', databaseEnabled: false, databaseUrl: '', confirmCommands: true };

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'provider'|'database'|'permissions'|'updates'>('provider');
  const [bottomOpen, setBottomOpen] = useState(true);
  const [activeRail, setActiveRail] = useState('files');
  const [code, setCode] = useState(starter);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [update, setUpdate] = useState<NativeUpdate | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [settings, setSettings] = useState<Settings>(() => { try { return { ...initialSettings, ...JSON.parse(localStorage.getItem('idk-ide-settings') || '{}') }; } catch { return initialSettings; } });
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'I’m ready. Ask me to explain, refactor, or build anything in this workspace.' }]);
  const dark = settings.theme === 'system' ? systemDark : settings.theme === 'dark';
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const update = () => setSystemDark(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);
  const local = useMemo(() => /localhost|127\.0\.0\.1/.test(settings.provider.baseUrl), [settings.provider.baseUrl]);

  const submit = async () => {
    const text = input.trim(); if (!connected || !settings.provider.model) { setConnectionMessage('Connect and verify a model before chatting.'); setSettingsTab('provider'); setSettingsOpen(true); return; } if (!text || busy) return;
    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]); setInput(''); setBusy(true);
    try {
      await streamChat(settings, history, token => setMessages(current => current.map((m, i) => i === current.length - 1 ? { ...m, content: m.content + token } : m)));
    } catch (error) {
      setMessages(current => current.map((m, i) => i === current.length - 1 ? { ...m, content: `Couldn’t reach ${settings.provider.name}. Open Settings and check the endpoint and model.\n\n${error instanceof Error ? error.message : 'Unknown error'}` } : m));
    } finally { setBusy(false); }
  };
  const connectProvider = async () => { setConnecting(true); setConnected(false); setConnectionMessage(''); try { const found = await discoverModels(settings); setModels(found); const model = found.includes(settings.provider.model) ? settings.provider.model : (found[0] || ''); setSettings(current => ({ ...current, provider: { ...current.provider, model } })); setConnectionMessage(found.length ? `${found.length} real model${found.length === 1 ? '' : 's'} discovered.` : 'The provider returned no models.'); } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'Connection failed'); } finally { setConnecting(false); } };
  const verifyProvider = async () => { setConnecting(true); setConnected(false); setConnectionMessage(''); try { const latency = await testConnection(settings); setConnected(true); setConnectionMessage(`Verified in ${latency} ms`); } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'Model verification failed'); } finally { setConnecting(false); } };
  const saveSettings = () => { const safe = { ...settings, provider: { ...settings.provider, apiKey: '' } }; localStorage.setItem('idk-ide-settings', JSON.stringify(safe)); setSettingsOpen(false); };
  const checkForUpdates = async () => { if (!isDesktopApp()) { setUpdateStatus('Updates are installed automatically with the website. Desktop updates are available in the Windows app.'); return; } setUpdateBusy(true); setUpdateStatus('Checking for updates…'); try { const found = await findNativeUpdate(); setUpdate(found); setUpdateStatus(found ? `Version ${found.version} is ready to download.` : 'You are using the latest version.'); } catch (error) { setUpdateStatus(error instanceof Error ? error.message : 'Could not check for updates.'); } finally { setUpdateBusy(false); } };
  const downloadUpdate = async () => { if (!update) return; setUpdateBusy(true); setUpdateStatus('Downloading update…'); try { await downloadNativeUpdate(update, progress => setUpdateProgress(progress.percent)); setUpdateReady(true); setUpdateProgress(100); setUpdateStatus('Download complete. Restart to finish updating.'); } catch (error) { setUpdateStatus(error instanceof Error ? error.message : 'Update download failed.'); } finally { setUpdateBusy(false); } };
  const restartAndUpdate = async () => { if (!update) return; setUpdateBusy(true); setUpdateStatus('Installing update…'); try { await installNativeUpdate(update); } catch (error) { setUpdateStatus(error instanceof Error ? error.message : 'Update installation failed.'); setUpdateBusy(false); } };

  return <div className="app-shell">
    <header className="titlebar">
      <div className="brand"><div className="brand-mark"><img src="/brand/ide-mark.svg" alt=""/></div><b>IDK</b><span className="edition">AI IDE</span></div>
      <div className="project-switch"><Folder size={14}/><span>personal-agent</span><ChevronDown size={13}/></div>
      <div className="title-actions"><button className={`status-pill ${connected ? 'online' : ''}`} onClick={() => { setSettingsTab('provider'); setSettingsOpen(true); }}><span className="status-dot"/>{connected ? 'Connected' : 'No model'}</button><a className="icon-btn" href="https://github.com/r-winn/IDK-IDE" target="_blank" rel="noreferrer"><Github size={17}/></a><button className="avatar">AR</button></div>
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
        <div className={`editor ${bottomOpen ? 'with-terminal' : ''}`}><Editor value={code} onChange={v => setCode(v || '')} language="typescript" theme={dark ? 'vs-dark' : 'light'} options={{ minimap:{enabled:true}, fontSize:14, lineHeight:23, fontFamily:"'JetBrains Mono', 'SFMono-Regular', Consolas, monospace", padding:{top:16}, smoothScrolling:true, cursorSmoothCaretAnimation:'on', overviewRulerBorder:false, scrollBeyondLastLine:false }}/></div>
        <div className={`terminal ${bottomOpen ? '' : 'collapsed'}`}>
          <div className="terminal-head"><div><button className="active">TERMINAL</button><button>OUTPUT</button><button>PROBLEMS <span>0</span></button></div><div><Plus size={14}/><ChevronDown size={14}/><X size={14} onClick={() => setBottomOpen(false)}/></div></div>
          <div className="terminal-body"><p><span className="green">➜</span> <span className="cyan">personal-agent</span> <span className="purple-text">git:(main)</span> npm run dev</p><p className="muted">IDK agent runtime ready on http://localhost:3000</p><p><span className="green">➜</span> <span className="cyan">personal-agent</span> <span className="cursor-block"> </span></p></div>
        </div>
      </section>
      <aside className="ai-panel">
        <div className="ai-head"><div><div className="agent-icon"><img src="/brand/ide-mark.svg" alt=""/></div><div><b>IDK Agent</b><span>{settings.provider.model || 'No model connected'}</span></div></div><button className="icon-btn"><Menu size={16}/></button></div>
        <div className="context-bar"><span><Code2 size={13}/> agent.ts</span><button><Plus size={14}/> Add context</button></div>
        <div className="messages">
          {messages.map((m,i) => <div key={i} className={`message ${m.role}`}>
            {m.role === 'assistant' && <div className="mini-avatar"><img src="/brand/ide-mark.svg" alt=""/></div>}
            <div className="bubble">{m.content || <span className="typing"><i/><i/><i/></span>}</div>
          </div>)}
        </div>
        <div className="composer-wrap">{!connected && <button className="connect-notice" onClick={() => { setSettingsTab('provider'); setSettingsOpen(true); }}><Bot/><span><b>Connect a model to use the agent</b><small>Open AI provider settings</small></span><ChevronRight/></button>}<div className={`composer ${!connected ? 'locked' : ''}`}><textarea disabled={!connected} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();} }} placeholder={connected ? 'Ask IDK or type / for commands…' : 'Connect and verify a model first'}/><div className="composer-footer"><div><button disabled={!connected}><Plus size={16}/></button><button className="mode" disabled={!connected}><Bot size={14}/> Agent <ChevronDown size={12}/></button></div><button className="send" onClick={submit} disabled={!connected || !input.trim() || busy}><Send size={15}/></button></div></div><p className="disclaimer">IDK can make mistakes. Review generated code.</p></div>
      </aside>
    </main>
    <footer className="statusbar"><div><span><GitBranch size={12}/> main*</span><span><Check size={12}/> 0</span><span><Activity size={12}/> Ready</span></div><div><span>{local ? <HardDrive size={12}/> : <Globe2 size={12}/>} {local ? 'Local' : 'Cloud'}</span><span>TypeScript</span><span>Ln 8, Col 12</span><span>UTF-8</span></div></footer>
    {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head"><div><div className="settings-icon"><img src="/brand/ide-mark.svg" alt=""/></div><div><h2>IDK IDE Settings</h2><p>Models, workspace data and safe agent behavior</p></div></div><button className="icon-btn" onClick={() => setSettingsOpen(false)}><X size={18}/></button></div>
      <div className="settings-layout"><nav><button className={settingsTab==='provider'?'active':''} onClick={()=>setSettingsTab('provider')}><Bot size={16}/> AI provider</button><button className={settingsTab==='database'?'active':''} onClick={()=>setSettingsTab('database')}><Database size={16}/> Data & memory</button><button className={settingsTab==='permissions'?'active':''} onClick={()=>setSettingsTab('permissions')}><ShieldCheck size={16}/> Permissions</button><button className={settingsTab==='updates'?'active':''} onClick={()=>setSettingsTab('updates')}><CloudDownload size={16}/> Updates</button></nav><div className="settings-content">
        {settingsTab === 'provider' && <><h3>AI provider</h3><p className="help">Connect an OpenAI-compatible local or cloud endpoint. Only real models returned by the provider are shown.</p>
          <div className="field-row"><label>Provider name<input value={settings.provider.name} onChange={e=>{setConnected(false);setSettings({...settings,provider:{...settings.provider,name:e.target.value}})}}/></label><label>Base URL<input value={settings.provider.baseUrl} onChange={e=>{setConnected(false);setModels([]);setSettings({...settings,provider:{...settings.provider,baseUrl:e.target.value}})}}/></label></div>
          <label>API key <small>Leave empty for local Ollama or LM Studio</small><input type="password" placeholder="sk-…" value={settings.provider.apiKey} onChange={e=>{setConnected(false);setSettings({...settings,provider:{...settings.provider,apiKey:e.target.value}})}}/></label>
          <div className="connection-actions"><button className="secondary" disabled={connecting || !settings.provider.baseUrl} onClick={connectProvider}><RefreshCw className={connecting?'spinning':''}/>{connecting?'Connecting…':'Discover models'}</button>{models.length>0 && <label>Model<select value={settings.provider.model} onChange={e=>{setConnected(false);setSettings({...settings,provider:{...settings.provider,model:e.target.value}})}}>{models.map(model=><option key={model}>{model}</option>)}</select></label>}<button className="primary" disabled={connecting || !settings.provider.model} onClick={verifyProvider}><ShieldCheck/>{connected?'Verified':'Test model'}</button></div>
          {connectionMessage && <div className={`connection-result ${connected?'success':''}`}>{connectionMessage}</div>}
        </>}
        {settingsTab === 'database' && <><h3>Data & memory</h3><p className="help">Optional project storage. Keep it disabled unless your workspace needs persistent context.</p><div className="toggle-row"><div><b>Project database</b><p>Enable long-term memory and indexed project context.</p></div><button className={`toggle ${settings.databaseEnabled?'on':''}`} onClick={()=>setSettings({...settings,databaseEnabled:!settings.databaseEnabled})}><i/></button></div>{settings.databaseEnabled && <label>Database URL<input placeholder="postgresql://… or sqlite://…" value={settings.databaseUrl} onChange={e=>setSettings({...settings,databaseUrl:e.target.value})}/></label>}</>}
        {settingsTab === 'permissions' && <><h3>Permissions & appearance</h3><p className="help">Keep potentially destructive agent actions under your control.</p><div className="toggle-row"><div><b>Confirm terminal commands</b><p>Require approval before an agent runs any command.</p></div><button className={`toggle ${settings.confirmCommands?'on':''}`} onClick={()=>setSettings({...settings,confirmCommands:!settings.confirmCommands})}><i/></button></div><label>Theme<select value={settings.theme} onChange={e=>setSettings({...settings,theme:e.target.value as Settings['theme']})}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label>System prompt<textarea className="system-prompt" value={settings.systemPrompt} onChange={e=>setSettings({...settings,systemPrompt:e.target.value})}/></label></>}
        {settingsTab === 'updates' && <><h3>Software updates</h3><p className="help">Keep the Windows desktop app current without downloading a new installer manually.</p><div className="update-summary"><div className="update-orb"><CloudDownload/></div><div><b>IDK IDE {APP_VERSION}</b><p>{isDesktopApp() ? 'Windows desktop application' : 'Web application'}</p></div></div><div className="update-actions">{!update && <button className="primary" disabled={updateBusy} onClick={checkForUpdates}><RefreshCw className={updateBusy?'spinning':''}/>{updateBusy?'Checking…':'Check for updates'}</button>}{update && !updateReady && <button className="primary" disabled={updateBusy} onClick={downloadUpdate}><CloudDownload/>{updateBusy?'Downloading…':`Download ${update.version}`}</button>}{updateReady && <button className="primary" disabled={updateBusy} onClick={restartAndUpdate}><RotateCcw/>Restart and update</button>}</div>{(updateBusy && update) || updateProgress > 0 ? <div className="update-progress"><div><span>Download progress</span><b>{updateProgress}%</b></div><progress max="100" value={updateProgress}/></div> : null}{updateStatus && <div className="connection-result success">{updateStatus}</div>}</>}
      </div></div><div className="modal-footer"><button className="secondary" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="primary" onClick={saveSettings}>Save settings</button></div>
    </div></div>}
  </div>;
}
export default App;
