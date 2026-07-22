"use client";

import React, { useState, useEffect } from 'react';
import { browseDirectory, BrowseResponse } from '../services/api';

interface DirectoryBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export default function DirectoryBrowser({ isOpen, onClose, onSelect, initialPath }: DirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [drives, setDrives] = useState<string[]>([]);
  const [directories, setDirectories] = useState<BrowseResponse['directories']>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath || "");
    }
  }, [isOpen, initialPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await browseDirectory(path);
      setCurrentPath(data.current_path);
      setParentPath(data.parent_path);
      setDrives(data.drives);
      setDirectories(data.directories);
      setManualPath(data.current_path);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve directory contents. Please make sure the folder path exists and is accessible.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPath.trim()) {
      loadDirectory(manualPath.trim());
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
    onClose();
  };

  if (!isOpen) return null;

  // Split path into clickable segments for breadcrumbs
  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    
    // Windows paths might look like C:/Users/name...
    // Unix paths start with /
    const isWindows = /^[a-zA-Z]:/.test(currentPath);
    const parts = currentPath.split('/').filter(Boolean);
    
    const breadcrumbs: { label: string; path: string }[] = [];
    
    if (isWindows) {
      // First part is the drive (e.g. C:)
      const drive = currentPath.substring(0, currentPath.indexOf('/')) || currentPath;
      breadcrumbs.push({ label: drive, path: drive + "/" });
      
      let accumulated = drive;
      for (let i = 1; i < parts.length; i++) {
        accumulated += "/" + parts[i];
        breadcrumbs.push({ label: parts[i], path: accumulated });
      }
    } else {
      // Unix root folder
      breadcrumbs.push({ label: "Root ( / )", path: "/" });
      let accumulated = "";
      for (let i = 0; i < parts.length; i++) {
        accumulated += "/" + parts[i];
        breadcrumbs.push({ label: parts[i], path: accumulated });
      }
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const isDockerContainer = currentPath.startsWith('/host_repo') || currentPath.startsWith('/app') && drives.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-3xl bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-2xl flex flex-col h-[85vh] max-h-[700px] overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-900 flex justify-between items-center bg-gradient-to-r from-neutral-950 to-neutral-900">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-rose-500">📁</span>
              Select Codebase Repository
            </h3>
            <p className="text-xs text-neutral-400 mt-1">Browse your PC directory structure to select an existing codebase.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 flex flex-col min-h-0 bg-[#070707]">
          {/* Docker Warning Badge */}
          {isDockerContainer && (
            <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-[11px] text-rose-400 leading-normal flex items-start gap-2">
              <span>⚠️</span>
              <div>
                <strong>Running inside Docker Container:</strong> You are browsing the container sandbox. Drives outside of mounted host volumes are inaccessible. To select repositories anywhere on your PC, run the services natively using <code className="text-rose-300">.\start-backend.ps1</code>.
              </div>
            </div>
          )}

          {/* Drives Selection (Windows Host) */}
          {drives.length > 0 && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Available Drives</label>
              <div className="flex flex-wrap gap-2">
                {drives.map((drive) => (
                  <button
                    key={drive}
                    onClick={() => loadDirectory(drive)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      currentPath.toLowerCase().startsWith(drive.toLowerCase())
                        ? 'bg-rose-950/30 text-rose-400 border-rose-800/60'
                        : 'bg-[#111] hover:bg-[#1a1a1a] text-neutral-300 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    💾 {drive.replace('/', '')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Path and Navigation Row */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Current Folder Location</label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                placeholder="Paste or enter absolute directory path..."
                className="flex-1 bg-[#111] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-neutral-900 hover:bg-[#151515] border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Go
              </button>
            </form>
          </div>

          {/* Breadcrumb Trail */}
          {breadcrumbs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-3 bg-neutral-950/50 border border-neutral-900 rounded-xl text-xs font-mono text-neutral-400 overflow-x-auto whitespace-nowrap">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.path}>
                  {idx > 0 && <span className="text-neutral-700">/</span>}
                  <button
                    onClick={() => loadDirectory(crumb.path)}
                    className="hover:text-rose-400 hover:underline transition-colors text-left"
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-[11px] text-red-400 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Directory Listing Container */}
          <div className="flex-1 border border-neutral-900 bg-[#050505] rounded-xl overflow-hidden flex flex-col min-h-[200px]">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <span className="inline-block animate-spin text-xl text-rose-500">🔄</span>
                <span className="text-xs text-neutral-500">Scanning directory nodes...</span>
              </div>
            ) : directories.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <span className="text-2xl mb-2">📂</span>
                <span className="text-xs text-neutral-500 italic">No subdirectories found.</span>
                {parentPath && (
                  <button
                    onClick={() => loadDirectory(parentPath)}
                    className="mt-3 px-3 py-1.5 bg-[#111] hover:bg-[#1a1a1a] border border-neutral-800 text-xs rounded-lg text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Go back up
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-neutral-950/55 p-1">
                {/* Back to Parent Directory Button */}
                {parentPath && (
                  <div 
                    onClick={() => loadDirectory(parentPath)}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#111]/30 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="text-sm">⬆️</span>
                    <span>.. (Parent Directory)</span>
                  </div>
                )}

                {/* Subdirectories list */}
                {directories.map((dir) => (
                  <div
                    key={dir.path}
                    onClick={() => loadDirectory(dir.path)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#111]/40 rounded-lg cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base text-amber-500 group-hover:scale-105 transition-transform duration-200">
                        📁
                      </span>
                      <span className="text-xs font-medium text-neutral-300 group-hover:text-white truncate">
                        {dir.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {dir.is_git && (
                        <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider rounded-md bg-rose-950/30 text-rose-400 border border-rose-900/40">
                          Git Repo
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400 transition-colors">
                        &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-neutral-900 flex justify-between items-center bg-gradient-to-r from-neutral-900 to-neutral-950">
          <div className="text-neutral-500 text-[10px] font-mono truncate max-w-sm">
            Selected: <span className="text-neutral-300 font-semibold">{currentPath || "None"}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-400 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={loading || !currentPath}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg hover:shadow-rose-950/20 transition-all cursor-pointer"
            >
              Select Current Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
