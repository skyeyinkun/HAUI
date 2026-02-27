import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Bell, AlertTriangle, X, Download, Plus, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Log } from '@/types/dashboard';

// --- Types ---

export type AlertLevel = 'emergency' | 'important' | 'general';

export interface AlertRule {
  id: string;
  name: string;
  keyword: string;
  thresholdCount: number;
  thresholdDurationSeconds: number; // e.g. 60 for 1 min
  level: AlertLevel;
  entityPattern: string; // Regex string for entity ID matching (simulated)
  enabled: boolean;
}

interface LogCardAddonProps {
  logs: Log[];
  onExport: (logs: Log[]) => void;
  onClose: () => void;
  originalHeader: React.ReactNode;
}

// --- Mock API ---
const MOCK_API_DELAY = 200;

const mockSaveRule = async (rule: Omit<AlertRule, 'id'>): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`rule_${Date.now()}`);
    }, MOCK_API_DELAY);
  });
};

// --- Helper Components ---

const LevelBadge = ({ level }: { level: AlertLevel }) => {
  const colors = {
    emergency: 'bg-red-500/10 text-red-500 border-red-500/20',
    important: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    general: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };
  const labels = {
    emergency: '紧急',
    important: '重要',
    general: '一般',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[level]}`}>
      {labels[level]}
    </span>
  );
};

// --- Main Component ---

export default function LogCardAddon({ logs, onExport, onClose, originalHeader }: LogCardAddonProps) {
  // View State
  const [viewMode, setViewMode] = useState<'normal' | 'alert'>('normal');
  const [showConfig, setShowConfig] = useState(false);
  
  // Search State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLevel, setSearchLevel] = useState<string>('all'); // all, ERROR, WARN, INFO (simulated based on message content)
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  
  // Alert State
  const [rules, setRules] = useState<AlertRule[]>(() => {
    const saved = localStorage.getItem('log_alert_rules');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeAlert, setActiveAlert] = useState<{ rule: AlertRule; log: Log; timestamp: number } | null>(null);
  const [alertLogs, setAlertLogs] = useState<Log[]>([]);
  
  // New Rule Form State
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    keyword: '',
    thresholdCount: 1,
    thresholdDurationSeconds: 60,
    level: 'general',
    entityPattern: '.*',
    enabled: true
  });

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('log_alert_rules', JSON.stringify(rules));
  }, [rules]);

  // Alert Detection Logic
  // In a real app, this would be more complex with time windows.
  // Here we check the *latest* log against rules when logs update.
  useEffect(() => {
    if (logs.length === 0) return;
    const latestLog = logs[0]; // Assuming logs[0] is newest

    // Check each enabled rule
    for (const rule of rules) {
      if (!rule.enabled) continue;
      
      // Simple Keyword Match
      if (latestLog.message.includes(rule.keyword)) {
        // Trigger Alert!
        triggerAlert(rule, latestLog);
        break; // Trigger first matching rule
      }
    }
  }, [logs, rules]);

  const triggerAlert = (rule: AlertRule, log: Log) => {
    // Only switch if not already in alert mode for the same or higher priority?
    // For now, just switch.
    setActiveAlert({ rule, log, timestamp: Date.now() });
    setViewMode('alert');
    
    // In a real app, we'd filter the last N logs that match this alert context
    // For now, snapshot the current logs
    setAlertLogs(logs.slice(0, 50));
  };

  const handleSaveRule = async () => {
    if (!newRule.name || !newRule.keyword) return;
    
    const id = await mockSaveRule(newRule as any);
    const rule: AlertRule = {
      id,
      name: newRule.name!,
      keyword: newRule.keyword!,
      thresholdCount: newRule.thresholdCount || 1,
      thresholdDurationSeconds: newRule.thresholdDurationSeconds || 60,
      level: (newRule.level as AlertLevel) || 'general',
      entityPattern: newRule.entityPattern || '.*',
      enabled: true
    };
    
    setRules(prev => [...prev, rule]);
    setNewRule({
        name: '',
        keyword: '',
        thresholdCount: 1,
        thresholdDurationSeconds: 60,
        level: 'general',
        entityPattern: '.*',
        enabled: true
    });
    setShowConfig(false);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  // Filtered Logs for Display
  const displayedLogs = useMemo(() => {
    if (viewMode === 'alert') return alertLogs;
    
    return logs.filter(log => {
      const matchKeyword = !debouncedKeyword || log.message.toLowerCase().includes(debouncedKeyword.toLowerCase());
      // Simulate level extraction (assuming logs might contain [ERROR] etc, or just default to INFO if plain)
      // Since current logs are just "time message", we'll do a loose text match for level filtering if user selects one
      // Or just ignore level if not present. Let's assume standard HA logs might have text indicators.
      let matchLevel = true;
      if (searchLevel !== 'all') {
         // Simple heuristic: does message contain "error" if level is ERROR?
         matchLevel = log.message.toLowerCase().includes(searchLevel.toLowerCase());
      }
      return matchKeyword && matchLevel;
    });
  }, [logs, alertLogs, viewMode, debouncedKeyword, searchLevel]);

  // Highlight Helper
  const renderMessage = (msg: string) => {
    if (!debouncedKeyword || viewMode === 'alert') return msg;
    const parts = msg.split(new RegExp(`(${debouncedKeyword})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === debouncedKeyword.toLowerCase() 
        ? <span key={i} className="bg-yellow-500/20 text-yellow-500 font-medium rounded px-0.5">{part}</span> 
        : part
    );
  };

  // --- Render ---

  // Alert Panel Header
  if (viewMode === 'alert' && activeAlert) {
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Alert Header Strip */}
        <div className={`shrink-0 px-6 py-3 flex items-center justify-between ${
          activeAlert.rule.level === 'emergency' ? 'bg-red-500 text-white' :
          activeAlert.rule.level === 'important' ? 'bg-orange-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-white/20 rounded-full animate-pulse">
                <AlertTriangle className="w-5 h-5" />
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">告警触发: {activeAlert.rule.name}</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">{activeAlert.rule.level}</span>
                </div>
                <span className="text-xs opacity-90">{new Date(activeAlert.timestamp).toLocaleTimeString()} - 触发关键字: "{activeAlert.rule.keyword}"</span>
             </div>
          </div>
          <button 
             onClick={() => setViewMode('normal')}
             className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
          >
             返回实时日志
          </button>
        </div>

        {/* Alert Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-card">
           <div className="p-4 border-b border-border/10 flex justify-between items-center">
              <h3 className="text-sm font-medium text-foreground">告警上下文快照 (最近50条)</h3>
              {/* Export removed */}
           </div>
           <div className="flex-1 overflow-y-auto px-4 py-2">
               {alertLogs.map((log, i) => (
                  <div key={i} className={`flex items-start gap-4 p-2 rounded border-b border-border/5 text-sm ${
                      log === activeAlert.log ? 'bg-red-500/5 border-red-500/20' : ''
                  }`}>
                    <span className="text-muted-foreground font-mono shrink-0 w-20">{log.time}</span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
               ))}
           </div>
        </div>
      </div>
    );
  }

  // Normal Mode
  return (
    <div className="flex flex-col h-full relative">
       {/* Inject into Header Area */}
       <div className="flex flex-col shrink-0 border-b border-border/10">
          {/* Original Header Content + Addons */}
          <div className="p-6 pb-2 flex items-center justify-between">
              <div className="flex-1">{originalHeader}</div>
              
              <div className="flex items-center gap-2 ml-4">
                  {/* Alert Config Button */}
                  <div className="relative">
                      <button 
                        onClick={() => setShowConfig(!showConfig)}
                        className={`p-2 rounded-full transition-colors relative ${showConfig ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'}`}
                        title="告警配置"
                      >
                          <Bell className="w-5 h-5" />
                          {rules.some(r => r.enabled) && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-card" />
                          )}
                      </button>
                      
                      {/* Config Modal (Popover) */}
                      {showConfig && (
                          <div className="absolute right-0 top-full mt-2 w-80 bg-popover rounded-xl shadow-xl border border-border/10 z-50 p-4 animate-in fade-in zoom-in-95 origin-top-right">
                              <h3 className="text-sm font-semibold mb-3">告警规则配置</h3>
                              
                              {/* Rule List */}
                              <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                                  {rules.map(rule => (
                                      <div key={rule.id} className="flex items-center justify-between p-2 rounded bg-accent/50 text-xs">
                                          <div className="flex flex-col">
                                              <div className="flex items-center gap-1">
                                                  <span className="font-medium">{rule.name}</span>
                                                  <LevelBadge level={rule.level} />
                                              </div>
                                              <span className="text-muted-foreground scale-90 origin-left">包含: {rule.keyword}</span>
                                          </div>
                                          <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-red-500">
                                              <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                      </div>
                                  ))}
                                  {rules.length === 0 && <div className="text-center text-xs text-muted-foreground py-2">暂无规则</div>}
                              </div>
                              
                              {/* New Rule Form */}
                              <div className="space-y-2 border-t border-border/10 pt-3">
                                  <input 
                                    className="w-full text-xs p-2 rounded bg-background border border-border/20"
                                    placeholder="规则名称"
                                    value={newRule.name}
                                    onChange={e => setNewRule({...newRule, name: e.target.value})}
                                  />
                                  <div className="flex gap-2">
                                      <input 
                                        className="w-2/3 text-xs p-2 rounded bg-background border border-border/20"
                                        placeholder="关键字"
                                        value={newRule.keyword}
                                        onChange={e => setNewRule({...newRule, keyword: e.target.value})}
                                      />
                                      <select 
                                        className="w-1/3 text-xs p-2 rounded bg-background border border-border/20"
                                        value={newRule.level}
                                        onChange={e => setNewRule({...newRule, level: e.target.value as any})}
                                      >
                                          <option value="general">一般</option>
                                          <option value="important">重要</option>
                                          <option value="emergency">紧急</option>
                                      </select>
                                  </div>
                                  <button 
                                    onClick={handleSaveRule}
                                    disabled={!newRule.name || !newRule.keyword}
                                    className="w-full py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50 mt-1"
                                  >
                                      添加规则
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="w-px h-6 bg-border/10 mx-1" />
                  
                  {/* Close Button (Moved from original header) */}
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-6 h-6" />
                  </button>
              </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 pb-4 flex items-center gap-3">
             <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <input 
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-accent/30 border border-transparent focus:border-primary/20 focus:bg-accent/50 outline-none text-sm transition-all"
                    placeholder="搜索日志关键字..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                 />
             </div>
             <select 
                className="px-3 py-2 rounded-xl bg-accent/30 border border-transparent outline-none text-sm text-muted-foreground"
                value={searchLevel}
                onChange={(e) => setSearchLevel(e.target.value)}
             >
                 <option value="all">所有级别</option>
                 <option value="info">INFO</option>
                 <option value="warn">WARN</option>
                 <option value="error">ERROR</option>
             </select>
          </div>
       </div>

       {/* Log List */}
       <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <div className="flex flex-col gap-2">
                {displayedLogs.length > 0 ? displayedLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors border border-transparent hover:border-border/10 group">
                    <span className="text-sm text-muted-foreground font-mono shrink-0 pt-0.5 w-20">{log.time}</span>
                    <span className="text-sm text-foreground break-all">{renderMessage(log.message)}</span>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 gap-3">
                    <Search className="w-8 h-8 opacity-50" />
                    <span>没有找到匹配的日志</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 text-center text-xs text-muted-foreground/40 border-t border-border/5 shrink-0 flex justify-between px-6">
                <span>共 {displayedLogs.length} 条记录</span>
                <span>日志仅存储在本地浏览器缓存中</span>
            </div>
       </div>
    </div>
  );
}
