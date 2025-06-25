// src/components/TopPanel/WorkerPanel.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@/context/ChatProvider';
import { Worker } from '@/context/ChatProvider';
import { WorkerInfoPopup } from '@/components/TopPanel/WorkerInfoPopup';

// Helper to determine worker status (e.g., for color)
const getWorkerStatus = (worker: Worker) => {
  const hasGpu = Object.keys(worker.hardware_info.GPUs_info).length > 0;
  const isIdle = worker.io_queue.length === 0;
  if (hasGpu && isIdle) return 'green'; // Idle GPU worker
  if (!hasGpu) return 'red'; // No GPU or busy
  return 'red'; // Busy GPU worker
};


export const WorkerPanel: React.FC = () => {
  const { workers } = useChat();
  const [activeWorker, setActiveWorker] = useState<Worker | null>(null);
  const [pinnedWorker, setPinnedWorker] = useState<Worker | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (worker: Worker, e: React.MouseEvent) => {
    if (pinnedWorker) return; // Don't show hover info if a worker is pinned
    setActiveWorker(worker);
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupStyle({
      top: `${rect.bottom + 10}px`,
      left: `${rect.left}px`,
    });
  };

  const handleMouseLeave = () => {
    if (pinnedWorker) return;
    setActiveWorker(null);
  };

  const handleClick = (worker: Worker, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicks from bubbling up
    if (pinnedWorker && pinnedWorker.node_id === worker.node_id) {
      // Unpin if clicking the same worker
      setPinnedWorker(null);
      setActiveWorker(null);
    } else {
      // Pin new worker
      setPinnedWorker(worker);
      setActiveWorker(worker); // Ensure it's active
      const rect = e.currentTarget.getBoundingClientRect();
      setPopupStyle({ top: `${rect.bottom + 10}px`, left: `${rect.left}px` });
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedWorker(null);
        setActiveWorker(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
  
  const workerCount = workers.length;
  const isOrbital = workerCount > 8;
  const isPaused = !!pinnedWorker;

  // Dynamic scaling for orbital layout
  const containerSize = 200; // Base size of the orbital container
  const scaleFactor = workerCount > 16 ? 16 / workerCount : 1;
  const dotSize = Math.max(8, 20 * scaleFactor);

  // Determine number of rings
  const rings: Worker[][] = [];
  if (isOrbital) {
    let workersCopy = [...workers];
    let ringCapacity = 8; // First ring capacity
    while (workersCopy.length > 0) {
      const ring = workersCopy.splice(0, ringCapacity);
      rings.push(ring);
      ringCapacity = Math.floor(ringCapacity * 1.5); // Next ring is larger
    }
  }

  return (
    <div ref={panelRef} className="worker-panel-container">
      {isOrbital ? (
        // ORBITAL LAYOUT (more than 8 workers)
        <div className="orbital-system" style={{ width: containerSize, height: containerSize, animationPlayState: isPaused ? 'paused' : 'running' }}>
          {rings.map((ring, ringIndex) => {
            const ringRadius = (containerSize / 2) * (0.4 + ringIndex * 0.3);
            const duration = 20 + ringIndex * 10; // Outer rings are slower
            const direction = ringIndex % 2 === 0 ? 'normal' : 'reverse';
            return (
              <div key={ringIndex} className="orbit" style={{
                width: ringRadius * 2,
                height: ringRadius * 2,
                animation: `spin ${duration}s linear infinite ${direction}`,
                animationPlayState: isPaused ? 'paused' : 'running',
              }}>
                {ring.map((worker, workerIndex) => {
                  const angle = (workerIndex / ring.length) * 2 * Math.PI;
                  const x = ringRadius * Math.cos(angle);
                  const y = ringRadius * Math.sin(angle);
                  const color = getWorkerStatus(worker) === 'green' ? '#2e7d32' : '#c62828';
                  
                  return (
                    <div
                      key={worker.node_id}
                      className="worker-dot"
                      style={{
                        width: dotSize,
                        height: dotSize,
                        backgroundColor: color,
                        transform: `translate(${x}px, ${y}px)`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                      }}
                      onMouseEnter={(e) => handleMouseEnter(worker, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => handleClick(worker, e)}
                    >
                      <div className="dot-center" style={{ animationPlayState: isPaused ? 'paused' : 'running' }}></div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        // MAGI LAYOUT (1-8 workers)
        <div className={`magi-layout worker-count-${workerCount}`}>
          {workers.map(worker => {
            const color = getWorkerStatus(worker) === 'green' ? 'lightgreen' : 'lightcoral';
            return (
              <div
                key={worker.node_id}
                className="worker-shape"
                style={{ backgroundColor: color }}
                onMouseEnter={(e) => handleMouseEnter(worker, e)}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => handleClick(worker, e)}
              >
                SLLM_WORKER_{worker.node_id}
              </div>
            );
          })}
        </div>
      )}
      
      {/* The Info Popup */}
      {activeWorker && <WorkerInfoPopup worker={activeWorker} style={popupStyle} />}

      <style jsx>{`
        .worker-panel-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 250px;
          position: relative;
        }
        
        /* Magi Layout Styles */
        .magi-layout { display: grid; gap: 10px; }
        .worker-shape {
          width: 120px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: monospace;
          font-weight: bold;
          color: black;
          clip-path: polygon(0 15%, 15% 0, 85% 0, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0 85%);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .worker-shape:hover {
          transform: scale(1.05);
          box-shadow: 0 0 15px rgba(0,0,0,0.3);
        }

        /* Magi grid configurations based on worker count */
        .worker-count-1 { grid-template-columns: 1fr; }
        .worker-count-2 { grid-template-columns: 1fr 1fr; }
        .worker-count-3 { display: flex; flex-direction: column; align-items: center; }
        .worker-count-3 .worker-shape:nth-child(2) { margin-left: 60px; }
        .worker-count-3 .worker-shape:nth-child(3) { margin-right: 60px; }
        
        /* Add more complex layouts as needed, using flex or grid */
        .worker-count-4 { grid-template-columns: 1fr 1fr; }
        
        /* Example for 8 workers in a circle-like grid */
        .worker-count-8 {
            display: grid;
            grid-template-areas: ". top ." "left . right" ". bottom .";
            grid-template-columns: 1fr auto 1fr;
        }
        .worker-count-8 .worker-shape:nth-child(1) { grid-area: top; }
        .worker-count-8 .worker-shape:nth-child(2) { grid-area: right; transform: rotate(45deg); }
        /* ... and so on for all 8 positions ... */


        /* Orbital Layout Styles */
        .orbital-system {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .orbit {
          position: absolute;
          border-radius: 50%;
          border: 1px dashed #ccc;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .worker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          margin: -10px; /* Half of size */
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dot-center {
           /* This creates the non-rotating center inside the dot */
           width: 50%;
           height: 50%;
           background: white;
           border-radius: 50%;
           animation: spin 20s linear infinite reverse; /* Counter-rotation */
        }
      `}</style>
    </div>
  );
};
