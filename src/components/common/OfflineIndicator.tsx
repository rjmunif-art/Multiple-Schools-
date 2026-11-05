import React from 'react';
import { useApp } from '../../context/AppContext';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle, CloudUpload } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, isSimulatedOffline, syncState, pendingMutationsCount, syncNow, toggleSimulateOffline } = useApp();

  const isActuallyOffline = !isOnline || isSimulatedOffline;

  return (
    <div className="fixed bottom-18 left-3 z-40 flex flex-col gap-1.5 pointer-events-auto">
      {/* Offline banner */}
      {isActuallyOffline && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-600/95 text-white px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xs border border-amber-400/40">
          <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-200" />
          <span>
            {isSimulatedOffline ? 'Simulated Offline (Field Mode)' : 'Offline Mode — Local Storage Active'}
          </span>
          <button
            onClick={toggleSimulateOffline}
            className="ml-1 underline text-[11px] text-amber-100 hover:text-white"
          >
            {isSimulatedOffline ? 'Go Online' : 'Simulate'}
          </button>
        </div>
      )}

      {/* Sync Badge / Action if pending mutations */}
      {pendingMutationsCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 text-white px-3 py-1.5 text-xs font-medium shadow-xl border border-slate-700 backdrop-blur-xs">
          <CloudUpload className="w-3.5 h-3.5 text-emerald-400" />
          <span>{pendingMutationsCount} offline {pendingMutationsCount === 1 ? 'change' : 'changes'} queued</span>
          {!isActuallyOffline && (
            <button
              onClick={() => syncNow()}
              disabled={syncState === 'syncing'}
              className="ml-1 flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
              {syncState === 'syncing' ? 'Syncing...' : 'Sync'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
