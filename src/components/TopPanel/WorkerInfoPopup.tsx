"use client";
import React from 'react';
import { Worker } from '@/context/ChatProvider';

interface WorkerInfoPopupProps {
  worker: Worker;
  style: React.CSSProperties;
}

export const WorkerInfoPopup: React.FC<WorkerInfoPopupProps> = ({ worker, style }) => {
  const getGpuInfo = () => {
    const gpuKey = Object.keys(worker.hardware_info.GPUs_info)[0];
    return gpuKey ? worker.hardware_info.GPUs_info[gpuKey] : null;
  };

  const gpu = getGpuInfo();

  return (
    <div
      style={style}
      className="worker-info-popup fixed z-[1000] w-72 rounded-lg border border-blue-600 bg-white p-3 font-mono text-xs text-gray-800 shadow-lg transition-opacity duration-200 ease-in-out pointer-events-none"
    >
      <h4 className="mb-2 text-sm font-bold text-blue-600">
        Worker Node: {worker.node_id}
      </h4>
      <div className="grid grid-cols-1 gap-1">
        <div><strong>Disk Size:</strong> {Math.round(worker.hardware_info.disk_size / 1e9)} GB</div>
        <div><strong>Disk Read BW:</strong> {Math.round(worker.hardware_info.disk_read_bandwidth / 1e6)} MB/s</div>
        <div><strong>Disk Write BW:</strong> {Math.round(worker.hardware_info.disk_write_bandwidth / 1e6)} MB/s</div>
        {gpu && (
          <>
            <div><strong>GPU:</strong> {gpu.Name}</div>
            <div><strong>GPU Load:</strong> {gpu.Load}</div>
            <div><strong>GPU Memory:</strong> {gpu.Used_Memory} / {gpu.Total_Memory}</div>
          </>
        )}
        <div><strong>IO Queue:</strong> {worker.io_queue.length}</div>
        <div><strong>Memory Chunks:</strong> {worker.used_memory_pool_chunks} / {worker.total_memory_pool_chunks}</div>
      </div>
    </div>
  );
};
