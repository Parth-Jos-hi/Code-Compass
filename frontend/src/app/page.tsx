"use client";

import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import MediaFrame from '../components/MediaFrame';
import FloatingAssets from '../components/FloatingAssets';
import ThreeDCanvas from '../components/ThreeDCanvas';
import DynamicSidebar from '../components/DynamicSidebar';
import { indexLocalRepository, getRepositoryNodes, IndexResponse, CodeNode } from '../services/api';

export default function Home() {
  const [repoPath, setRepoPath] = useState("");
  const [repoName, setRepoName] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<IndexResponse | null>(null);
  const [liveNodes, setLiveNodes] = useState<CodeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<CodeNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath || !repoName) return;

    setLoading(true);
    setError(null);
    setSelectedNode(null);
    try {
      const data = await indexLocalRepository(repoPath, repoName);
      setScanResult(data);

      const coordinates = await getRepositoryNodes(repoName);
      setLiveNodes(coordinates);
    } catch (err: any) {
      setError(err.message || "Failed connecting to local scanning engine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative z-0">
      <Navbar />
      <FloatingAssets />

      {/* Main Content Sections Wrapper */}
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 space-y-24 relative z-10">
        
        {/* Luxury Asymmetric Hero and Form Layout Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text and Form Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-bold tracking-[0.3em] uppercase text-rose-500">Voyage Engine v1.0</span>
              <h2 className="text-5xl font-black tracking-tight leading-tight text-white">
                We are high-end <br />
                <span className="text-neutral-400">luxurious map.</span>
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
                We abstract codebase structures into architectural constellations. Locked-in ingestion pipelines map vector spaces securely.
              </p>
            </div>

            {/* Premium Command Form Component */}
            <form onSubmit={handleScanSubmit} className="neon-glow-card premium-border-glow p-6 rounded-2xl space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase mb-2">Project Identifier</label>
                <input 
                  type="text"
                  placeholder="e.g. Aegis-SR"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full bg-[#111] border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase mb-2">Absolute Path Location</label>
                <input 
                  type="text"
                  placeholder="C:/Users/name/projects/my-app"
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  className="w-full bg-[#111] border border-neutral-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-rose-500 transition-colors"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full coral-glow-btn text-white text-xs font-bold py-3.5 px-4 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {loading ? "Scouting Repository Blocks..." : "Initialize Exploration"}
              </button>

              {error && (
                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-[11px] text-red-400 font-medium">
                  ⚠️ {error}
                </div>
              )}
            </form>
          </div>

          {/* Right Image Layout Column */}
          <div className="lg:col-span-7 flex justify-end">
            <MediaFrame scanResult={scanResult} />
          </div>
        </section>

        {/* Interactive 3D Spatial Map & Sidebar Split Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Interactive Spatial Constellation</h3>
              <p className="text-xs text-neutral-500">Live operational database feedback from active ingestion scans</p>
            </div>
            <span className="text-xs font-mono text-rose-500 bg-rose-950/20 px-3 py-1 rounded-full border border-rose-900/30">
              Active Targets: {liveNodes.length} Files
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 h-[580px] rounded-2xl overflow-hidden bg-[#050505] border border-neutral-900 shadow-inner relative">
              {liveNodes.length > 0 ? (
                <ThreeDCanvas nodes={liveNodes} onNodeSelect={setSelectedNode} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-center p-6 bg-gradient-to-b from-transparent to-[#0a0a0a]">
                  <p className="text-xs text-neutral-500 italic max-w-xs">
                    Awaiting initial local codebase scanning instruction sequence to plot files into configurations...
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <DynamicSidebar 
                selectedNode={selectedNode} 
                liveNodes={liveNodes} 
                setLiveNodes={setLiveNodes} 
                setSelectedNode={setSelectedNode} 
              />
            </div>
          </div>
        </section>

        {/* Lower Minimal Section Layout */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center border-t border-neutral-900 pt-8 gap-4">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">We are\'t fort ind refferesion</h4>
            <p className="text-xs text-neutral-500 mt-1">Lyhe option exvige vendor opacity settings control tracking pipelines.</p>
          </div>
          <button className="text-xs font-bold px-5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer">
            Test All Nodes
          </button>
        </section>

      </main>
    </div>
  );
}