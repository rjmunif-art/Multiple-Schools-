import React, { useState, useEffect } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PullToRefresh: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { syncNow } = useApp();
  const [startY, setStartY] = useState<number>(0);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshComplete, setRefreshComplete] = useState<boolean>(false);

  const PULL_THRESHOLD = 75;

  useEffect(() => {
    let touchStart = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 2) {
        touchStart = e.touches[0].clientY;
        setStartY(touchStart);
      } else {
        touchStart = 0;
        setStartY(0);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStart > 0 && window.scrollY <= 2 && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStart;
        if (diff > 0) {
          // Add resistance
          const distance = Math.min(diff * 0.45, 110);
          setPullDistance(distance);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(50);
        try {
          await syncNow();
          setRefreshComplete(true);
          setTimeout(() => {
            setRefreshComplete(false);
            setIsRefreshing(false);
            setPullDistance(0);
          }, 800);
        } catch {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      touchStart = 0;
      setStartY(0);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, syncNow]);

  return (
    <div className="relative w-full">
      {/* Pull Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-14 left-1/2 -translate-x-1/2 z-40 transition-all duration-150 pointer-events-none"
          style={{ transform: `translate(-50%, ${Math.min(pullDistance, 60)}px)` }}
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-emerald-500/60 shadow-xl text-xs text-white">
            {isRefreshing ? (
              refreshComplete ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Data Refreshed!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-slate-200 font-semibold">Refreshing School Data...</span>
                </>
              )
            ) : (
              <>
                <RefreshCw
                  className="w-4 h-4 text-emerald-400 transition-transform"
                  style={{ transform: `rotate(${pullDistance * 4}deg)` }}
                />
                <span className="text-slate-300 text-[11px]">
                  {pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull down to refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
