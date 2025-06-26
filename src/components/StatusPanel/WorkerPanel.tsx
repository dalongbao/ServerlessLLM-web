// src/components/TopPanel/WorkerPanel.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/ChatProvider';
import { Worker } from '@/context/types';
import { WorkerInfoPopup } from './WorkerInfoPopup';

// Green for idle GPU worker, Red for others
const getWorkerStatusColor = (worker: Worker) => {
  const hasGpu = Object.keys(worker.hardware_info.GPUs_info).length > 0;
  const isIdle = worker.io_queue.length === 0;
  return hasGpu && isIdle ? 'bg-green-300' : 'bg-red-300';
};

const getWorkerDotColor = (worker: Worker) => {
  const hasGpu = Object.keys(worker.hardware_info.GPUs_info).length > 0;
  const isIdle = worker.io_queue.length === 0;
  return hasGpu && isIdle ? 'bg-green-600' : 'bg-red-600';
};

export const WorkerPanel: React.FC = () => {
  const { workers } = useChat();
  const [activeWorker, setActiveWorker] = useState<Worker | null>(null);
  const [pinnedWorker, setPinnedWorker] = useState<Worker | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  const handleMouseEnter = (worker: Worker, e: React.MouseEvent) => {
    if (pinnedWorker) return;
    setActiveWorker(worker);
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupStyle({ top: `${rect.bottom + 10}px`, left: `${rect.left}px`, opacity: 1 });
  };

  const handleMouseLeave = () => {
    if (pinnedWorker) return;
    setActiveWorker(null);
    setPopupStyle(prev => ({ ...prev, opacity: 0 }));
  };

  const handleClick = (worker: Worker, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinnedWorker?.node_id === worker.node_id) {
      setPinnedWorker(null);
      setActiveWorker(null);
      setPopupStyle(prev => ({ ...prev, opacity: 0 }));
    } else {
      setPinnedWorker(worker);
      setActiveWorker(worker);
      const rect = e.currentTarget.getBoundingClientRect();
      setPopupStyle({ top: `${rect.bottom + 10}px`, left: `${rect.left}px`, opacity: 1 });
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedWorker(null);
        setActiveWorker(null);
        setPopupStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const workerCount = workers.length;
  const isOrbital = workerCount > 8;
  const isPaused = !!pinnedWorker;

  const containerSize = 250;
  const scaleFactor = workerCount > 16 ? 16 / workerCount : 1;
  const dotSize = Math.max(8, 20 * scaleFactor);

  const rings: Worker[][] = [];
  if (isOrbital) {
    let workersCopy = [...workers];
    let ringCapacity = 8;
    while (workersCopy.length > 0) {
      rings.push(workersCopy.splice(0, ringCapacity));
      ringCapacity = Math.floor(ringCapacity * 1.5);
    }
  }

  return (
    <div className="relative flex items-center justify-center w-full min-h-[30vh] p-5">
      {isOrbital ? (
        <div className="relative flex items-center justify-center" style={{ width: containerSize, height: containerSize }}>
          {rings.map((ring, ringIndex) => {
            const ringRadius = (containerSize / 2) * (0.4 + ringIndex * 0.3);
            const duration = 20 + ringIndex * 10;
            const direction = ringIndex % 2 === 0 ? 'normal' : 'reverse';
            return (
              <div key={ringIndex} className="absolute border border-dashed rounded-full border-gray-400" style={{
                width: ringRadius * 2,
                height: ringRadius * 2,
                animation: `spin ${duration}s linear infinite ${direction}`,
                animationPlayState: isPaused ? 'paused' : 'running',
              }}>
                {ring.map((worker, workerIndex) => {
                  const angle = (workerIndex / ring.length) * 2 * Math.PI;
                  const x = ringRadius * Math.cos(angle);
                  const y = ringRadius * Math.sin(angle);
                  return (
                    <div
                      key={worker.node_id}
                      className={`absolute top-1/2 left-1/2 rounded-full cursor-pointer flex items-center justify-center ${getWorkerDotColor(worker)}`}
                      style={{
                        width: dotSize,
                        height: dotSize,
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                      }}
                      onMouseEnter={(e) => handleMouseEnter(worker, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => handleClick(worker, e)}
                    >
                      <div className="w-1/2 h-1/2 bg-white rounded-full" style={{
                        animation: `spin ${duration}s linear infinite ${direction === 'normal' ? 'reverse' : 'normal'}`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                      }}></div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`grid gap-2.5 place-items-center w-auto worker-count-${workerCount}`}>
          {workers.map(worker => (
            <div
              key={worker.node_id}
              className={`worker-shape w-36 h-12 flex items-center justify-center font-mono font-bold text-black cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:z-10 ${getWorkerStatusColor(worker)}`}
              onMouseEnter={(e) => handleMouseEnter(worker, e)}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => handleClick(worker, e)}
            >
              SLLM_WORKER_{worker.node_id}
            </div>
          ))}
        </div>
      )}
      
      {activeWorker && <WorkerInfoPopup worker={activeWorker} style={popupStyle} />}
    </div>
  );
};
