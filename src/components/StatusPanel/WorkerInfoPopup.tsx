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

  // Helper to convert bytes/sec to MB/s
  const mbps = (n?: number) =>
    n == null ? "--" : `${(n / 1024 ** 2).toFixed(1)} MB/s`;

  // Safely extract the first available GPU's information.
  const gpuKey = Object.keys(worker.hardware_info?.static_gpu_info ?? {})[0];
  const staticGpu = gpuKey ? worker.hardware_info.static_gpu_info?.[gpuKey] : null;
  const dynamicGpu = gpuKey ? worker.hardware_info.gpu_info?.[gpuKey] : null;

  /* ---------- render ---------- */
  return (
    <div
      style={style}
      className="fixed z-[1000] w-72 rounded-lg border border-blue-600 bg-white p-3 font-mono text-xs text-gray-800 shadow-lg transition-opacity duration-200 ease-in-out pointer-events-none"
    >
      {/* --- Header with Worker ID and Status --- */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-blue-600">
          Worker ID: {worker.node_id}
        </h4>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${worker.status === "ready" ? "bg-green-500" : "bg-red-500"
              }`}
          ></span>
          <span className="capitalize">{worker.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 leading-snug">
        {/* --- Instance Info --- */}
        <div>
          <strong>Active Instances:</strong>{" "}
          {Object.keys(worker.instances_on_device).length}
        </div>

        {/* --- Hardware Info --- */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div>
            <strong>CPU Usage:</strong> {worker.hardware_info.cpu_percent?.toFixed(1) ?? "--"}%
          </div>
          <div>
            <strong>Disk Space:</strong> {gb(worker.hardware_info.disk_total_space)}
          </div>
          <div>
            <strong>Disk Read:</strong> {mbps(worker.hardware_info.disk_read_bandwidth)}
          </div>
          <div>
            <strong>Disk Write:</strong> {mbps(worker.hardware_info.disk_write_bandwidth)}
          </div>
        </div>

        {/* --- GPU Info (if available) --- */}
        {staticGpu && dynamicGpu && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div>
              <strong>GPU:</strong> {staticGpu.name}
            </div>
            <div>
              <strong>GPU Load:</strong> {dynamicGpu.load}%
            </div>
            <div>
              <strong>GPU Memory:</strong> {dynamicGpu.memory_used} MB / {staticGpu.total_memory} MB
            </div>
            <div>
              <strong>GPU Free:</strong> {dynamicGpu.memory_free} MB
            </div>
          </div>
        )}

        {/* --- Last Heartbeat --- */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div>
            <strong>Last Heartbeat:</strong>{" "}
            {new Date(worker.last_heartbeat_time).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};
