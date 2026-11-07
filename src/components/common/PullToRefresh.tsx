import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export const PullToRefresh: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { syncNow } = useApp();
  const [startY, setStartY] = useState<number>(0);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const PULL_THRESHOLD = 70;

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
          // Responsive resistance curve
          const distance = Math.min(diff * 0.45, 95);
          setPullDistance(distance);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(45);
        try {
          await syncNow();
        } catch (e) {
          console.warn('Pull-to-refresh sync warning:', e);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 600);
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
      {/* Centered Circular Pull Spinner with Color-Cycling Arc */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform duration-150 ease-out"
          style={{
            transform: `translate(-50%, ${Math.min(pullDistance, 55)}px)`,
            opacity: Math.min(pullDistance / 25, 1),
          }}
        >
          {/* Circular disc on soft shadow */}
          <div className="w-11 h-11 rounded-full bg-slate-900/95 border border-slate-700/80 shadow-2xl flex items-center justify-center p-2 backdrop-blur-sm">
            <svg
              className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              style={{
                transform: !isRefreshing ? `rotate(${pullDistance * 4.5}deg)` : undefined,
              }}
            >
              <circle
                className="opacity-20 text-slate-600"
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                className="pull-arc-cycling"
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="42"
                strokeDashoffset={isRefreshing ? '14' : `${Math.max(42 - (pullDistance / PULL_THRESHOLD) * 42, 5)}`}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Embedded inline keyframes for continuous Blue -> Green -> Red arc color cycle */}
      <style>{`
        @keyframes arcColorCycle {
          0%, 100% {
            stroke: #3b82f6; /* Blue */
          }
          33% {
            stroke: #10b981; /* Green */
          }
          66% {
            stroke: #ef4444; /* Red */
          }
        }
        .pull-arc-cycling {
          animation: arcColorCycle 2.4s linear infinite;
        }
      `}</style>

      {children}
    </div>
  );
};
