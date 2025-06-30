"use client";
import React, { useMemo } from "react";
import { useChat } from "@/context/ChatProvider";
import { Worker } from "@/context/types";

interface WorkerInfoPopupProps {
  nodeId: string;
  style: React.CSSProperties;
}

export const WorkerInfoPopup: React.FC<WorkerInfoPopupProps> = ({
  nodeId,
  style,
}) => {
  /** grab latest snapshot on every re-render */
  const { workers } = useChat();
  const worker: Worker | undefined = useMemo(
    () => workers.find((w) => w.node_id === nodeId),
    [workers, nodeId]
  );

  if (!worker)
    return (
      <div
        style={style}
        className="fixed z-[1000] rounded-lg border border-red-600 bg-white p-3 text-xs text-red-600 shadow-lg"
      >
        Worker {nodeId} not found
      </div>
    );

  /* ---------- helpers ---------- */
  // Helper to convert bytes to Gigabytes with 2 decimal places for precision.
  const gb = (n?: number) =>
    n == null ? "--" : `${(n / 1024 ** 3).toFixed(2)} GB`;

  // Safely extract the first available GPU's information.
  const gpuKey = Object.keys(worker.hardware_info?.GPUs_info ?? {})[0];
  const gpu = gpuKey ? worker.hardware_info.GPUs_info[gpuKey] : null;

  // Calculate the total memory pool size from chunks and chunk size.
  const totalMemoryPoolSize = worker.chunk_size * worker.total_memory_pool_chunks;

  /* ---------- render ---------- */
  return (
    <div
      style={style}
      className="fixed z-[1000] w-72 rounded-lg border border-blue-600 bg-white p-3 font-mono text-xs text-gray-800 shadow-lg transition-opacity duration-200 ease-in-out pointer-events-none"
    >
      {/* --- Header with Worker ID and Status --- */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-blue-600">
          Worker {worker.node_id}
        </h4>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              worker.status ? "bg-red-500" : "bg-green-500"
            }`}
          ></span>
          <span>{worker.status ? "Inference" : "Free"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 leading-snug">
        {/* --- Model and Queue Info --- */}
        <div>
          <strong>Disk models:</strong>{" "}
          {Object.keys(worker.disk_models ?? {}).length}
        </div>
        <div>
          <strong>Queued models:</strong>{" "}
          {Object.keys(worker.queued_models ?? {}).length}
        </div>
        <div>
          <strong>IO queue:</strong> {worker.io_queue?.length ?? 0}
        </div>

        {/* --- Memory Info --- */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <strong>Memory Pool:</strong> {gb(totalMemoryPoolSize)}
        </div>
        <div>
          <strong>Memory Chunks:</strong> {worker.used_memory_pool_chunks} /{" "}
          {worker.total_memory_pool_chunks}
        </div>
        <div>
          <strong>Chunk Size:</strong>{" "}
          {worker.chunk_size ? `${worker.chunk_size / 1024} KB` : "--"}
        </div>

        {/* --- GPU Info (if available) --- */}
        {gpu && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div>
              <strong>GPU:</strong> {gpu.Name}
            </div>
            <div>
              <strong>GPU Load:</strong> {gpu.Load}
            </div>
            <div>
              <strong>GPU Memory:</strong> {gpu.Used_Memory} / {gpu.Total_Memory}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
