"use client";

import React, { useState, useEffect } from 'react';
import { getMasteryStatus, socraticQuery, CodeNode, MasteryStatus } from '../services/api';

interface DynamicSidebarProps {
  selectedNode: CodeNode | null;
  liveNodes: CodeNode[];
  setLiveNodes: React.Dispatch<React.SetStateAction<CodeNode[]>>;
  setSelectedNode: React.Dispatch<React.SetStateAction<CodeNode | null>>;
  repoName: string;
  repoPath: string;
}

export default function DynamicSidebar({ selectedNode, liveNodes, setLiveNodes, setSelectedNode, repoName, repoPath }: DynamicSidebarProps) {
  const [activeTab, setActiveTab] = useState<'inspect' | 'rag' | 'quiz'>('inspect');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{ role: string; text: string }[]>([
    { role: 'assistant', text: 'Greetings. Ask me structural or algorithmic questions regarding this module. I will guide you conceptually using RAG framework details.' }
  ]);
  const [quizActive, setQuizActive] = useState(false);
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus | null>(null);
  const [loadingMastery, setLoadingMastery] = useState(false);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [showPromptChips, setShowPromptChips] = useState(true);
  const promptChips = [
    'Explain this file step by step.',
    'What is the main purpose of this code?',
    'Find any bugs or risky patterns.',
    'Walk me through the most important function.',
    'How does data flow through this module?'
  ];

  // Fetch mastery status when node is selected
  useEffect(() => {
    if (selectedNode && repoName) {
      setShowPromptChips(true);
      setLoadingMastery(true);
      getMasteryStatus(parseInt(selectedNode.id), repoName)
        .then(status => {
          setMasteryStatus(status);
        })
        .catch(err => {
          console.error('Failed to fetch mastery status:', err);
          setMasteryStatus(null);
        })
        .finally(() => setLoadingMastery(false));
    }
  }, [selectedNode, repoName]);

  const submitQuestion = async (questionText: string) => {
    if (!questionText.trim() || !selectedNode) return;

    const userMsg = questionText.trim();
    setShowPromptChips(false);
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setRagLoading(true);
    setRagError(null);

    try {
      const { answer } = await socraticQuery(userMsg, repoName, selectedNode.id, undefined, repoPath);
      setChatLog(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch Socratic answer.';
      setChatLog(prev => [...prev, { role: 'assistant', text: message }]);
      setRagError(message);
    } finally {
      setRagLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQuestion(chatInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuestion(chatInput);
    }
  };

  return (
    <div className="w-full h-[580px]">
      {selectedNode ? (
        <div className="bg-[#050505] border border-neutral-900 rounded-2xl p-4 h-full flex flex-col justify-between shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
          
          {/* Header Metadata Display */}
          <div>
            <div className="border-b border-neutral-900 pb-3 mb-3">
              <span className="text-[9px] font-black tracking-widest text-rose-500 uppercase bg-rose-950/20 border border-rose-900/30 px-2 py-1 rounded">
                {selectedNode.language}
              </span>
              <h4 className="text-sm font-mono font-bold text-white mt-2 truncate">
                {selectedNode.file_path.split('/').pop()}
              </h4>
            </div>

            {/* Premium Modular Interface Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#0c0c0c] p-1 rounded-xl border border-neutral-900 mb-4 text-[10px] font-bold text-center">
              <button 
                onClick={() => setActiveTab('inspect')} 
                className={`py-1.5 rounded-lg cursor-pointer transition-colors ${activeTab === 'inspect' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Inspect
              </button>
              <button 
                onClick={() => setActiveTab('rag')} 
                className={`py-1.5 rounded-lg cursor-pointer transition-colors ${activeTab === 'rag' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Socratic RAG
              </button>
              <button 
                onClick={() => setActiveTab('quiz')} 
                className={`py-1.5 rounded-lg cursor-pointer transition-colors ${activeTab === 'quiz' ? 'bg-neutral-900 text-white border border-neutral-800' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Quiz Module
              </button>
            </div>
          </div>

          {/* Active Container Screen Viewport */}
          <div className="flex-1 overflow-y-auto no-scrollbar pr-1 mb-4">
            
            {/* TAB 1: METRICS INSPECTOR */}
            {activeTab === 'inspect' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0c0c0c] p-3 rounded-xl border border-neutral-900">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Mastery Status</span>
                    {loadingMastery ? (
                      <span className="text-xs font-black text-neutral-400 mt-1 block">Loading...</span>
                    ) : (
                      <span className={`text-xs font-black block mt-1 uppercase ${
                        masteryStatus?.is_mastered ? "text-green-500" : "text-yellow-500"
                      }`}>
                        {masteryStatus?.is_mastered ? "✓ Mastered" : "🔄 Learning"}
                      </span>
                    )}
                  </div>
                  <div className="bg-[#0c0c0c] p-3 rounded-xl border border-neutral-900">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Avg Score</span>
                    <span className="text-xl font-black text-white font-mono">
                      {loadingMastery ? "—" : `${(masteryStatus?.average_score || 0) * 100 | 0}%`}
                    </span>
                  </div>
                </div>
                <div className="bg-[#0c0c0c] p-3 rounded-xl border border-neutral-900">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">Answer Statistics</span>
                  {loadingMastery ? (
                    <span className="text-xs text-neutral-400">Loading...</span>
                  ) : (
                    <div className="space-y-1 text-[11px] text-neutral-300">
                      <p>Total Answered: {masteryStatus?.total_questions_answered || 0}</p>
                      <p>Correct: {masteryStatus?.correct_answers || 0}</p>
                      {masteryStatus && masteryStatus.total_questions_answered > 0 && (
                        <p>Accuracy: {Math.round((masteryStatus.correct_answers / masteryStatus.total_questions_answered) * 100)}%</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-900/60">
                  <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Absolute Target Location</h5>
                  <p className="text-[11px] font-mono text-neutral-500 break-all leading-normal bg-black p-2 rounded-lg border border-neutral-900">{selectedNode.file_path}</p>
                </div>
              </div>
            )}

            {/* TAB 2: SOCRATIC RAG CONSOLE */}
            {activeTab === 'rag' && (
              <div className="flex flex-col h-full space-y-2 animate-in fade-in duration-200">
                <div className="flex-1 bg-[#0a0a0a] border border-neutral-900/80 rounded-xl p-3 text-[11px] font-mono space-y-3 h-[220px] overflow-y-auto no-scrollbar">
                  {chatLog.map((msg, idx) => (
                    <div key={idx} className={`p-2 rounded-lg ${msg.role === 'user' ? 'bg-rose-950/20 text-rose-300 ml-4 border border-rose-900/20' : 'bg-neutral-900 text-neutral-300 mr-4 border border-neutral-800'}`}>
                      <span className="block text-[8px] font-bold opacity-40 uppercase mb-0.5">{msg.role}</span>
                      {msg.text}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {showPromptChips && promptChips.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submitQuestion(prompt)}
                      disabled={ragLoading}
                      className="rounded-full border border-neutral-800 bg-[#0c0c0c] px-3 py-1 text-[10px] font-semibold text-neutral-300 transition-colors hover:border-rose-500 hover:text-white disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex flex-col gap-2 pt-1">
                  <textarea 
                    placeholder="Ask anything about this file..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    className="w-full bg-[#0c0c0c] border border-neutral-800 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none focus:border-rose-500 font-medium resize-none"
                  />
                  <div className="flex justify-between items-center text-[9px] text-neutral-500 font-medium">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    <button 
                      disabled={ragLoading} 
                      type="submit" 
                      className="coral-glow-btn text-white px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      {ragLoading ? 'Asking...' : 'Ask Scout'}
                    </button>
                  </div>
                </form>
                {ragError && <p className="text-[10px] text-red-400 mt-2">{ragError}</p>}
              </div>
            )}

            {/* TAB 3: CODE ASSESSMENT QUIZ MODULE */}
            {activeTab === 'quiz' && (
              <div className="space-y-4 animate-in fade-in duration-200 text-center py-2">
                <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  Answer questions to test your understanding. Reach 75% accuracy to master this module!
                </p>
                {quizActive ? (
                  <div className="bg-[#0a0a0a] border border-neutral-900 text-left p-3 rounded-xl space-y-2 animate-in zoom-in-95 duration-200">
                    <span className="text-[9px] text-rose-500 font-bold font-mono uppercase tracking-widest">Question Matrix</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">Questions are displayed in the main panel when you're ready to quiz.</p>
                    <button onClick={() => setQuizActive(false)} className="w-full mt-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white font-bold text-[10px] py-2 rounded-lg cursor-pointer">
                      Close
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setQuizActive(true)} 
                    className="coral-glow-btn text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer mt-2 inline-block"
                  >
                    Quiz Module Info
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Persistent Action Footer */}
          <div className="space-y-2 pt-3 border-t border-neutral-900">
            {masteryStatus?.is_mastered ? (
              <div className="w-full text-white font-bold text-xs py-3 px-4 rounded-xl bg-green-950/30 border border-green-900/50 text-center">
                ✓ Module Mastered at {Math.round(masteryStatus.average_score * 100)}%
              </div>
            ) : (
              <div className="w-full text-white font-bold text-xs py-3 px-4 rounded-xl bg-yellow-950/30 border border-yellow-900/50 text-center">
                {loadingMastery ? "Loading..." : `Answer more questions to reach 75% (Currently: ${Math.round((masteryStatus?.average_score || 0) * 100)}%)`}
              </div>
            )}
            <button 
              onClick={() => setSelectedNode(null)}
              className="w-full bg-transparent text-neutral-500 hover:text-neutral-300 font-semibold text-xs py-1 text-center cursor-pointer"
            >
              Close Inspector
            </button>
          </div>

        </div>
      ) : (
        <div className="bg-[#030303] border border-dashed border-neutral-900 rounded-2xl p-6 h-full flex items-center justify-center text-center text-neutral-600 text-xs italic">
          Select a file from the tree to view details and answer questions...
        </div>
      )}
    </div>
  );
}