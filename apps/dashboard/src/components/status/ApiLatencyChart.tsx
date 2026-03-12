"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface DataPoint {
  timestamp: string;
  value: number;
}

const ApiLatencyChart: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);

  // Simulate real-time data ingestion
  useEffect(() => {
    // Initial data
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(Date.now() - (20 - i) * 1000).toISOString(),
      value: Math.floor(Math.random() * 40) + 20, // 20-60ms range
    }));
    setData(initialData);

    const interval = setInterval(() => {
      setData((prev) => {
        const nextTime = new Date().toISOString();
        const nextValue = Math.max(15, Math.min(80, prev[prev.length - 1].value + (Math.random() * 20 - 10)));
        const newData = [...prev.slice(1), { timestamp: nextTime, value: nextValue }];
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const maxValue = 100; // Fixed scale for stability

  return (
    <div className="w-full h-full flex flex-col justify-end relative overflow-hidden rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm p-4">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Global API Latency</h3>
        <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
                {data.length > 0 ? Math.round(data[data.length - 1].value) : 0}
            </span>
            <span className="text-sm text-slate-500">ms</span>
        </div>
      </div>

      {/* Grid Lines */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
          <div className="border-b border-dashed border-slate-800/50 h-1/4 w-full" />
          <div className="border-b border-dashed border-slate-800/50 h-1/4 w-full" />
          <div className="border-b border-dashed border-slate-800/50 h-1/4 w-full" />
      </div>

      {/* Bars */}
      <div className="flex items-end justify-between gap-1 h-32 w-full z-0 mt-12">
        {data.map((point, i) => {
           const heightPercentage = (point.value / maxValue) * 100;
           // Color interpolation based on latency (Green -> Yellow -> Red)
           let barColor = "bg-emerald-500";
           if(point.value > 50) barColor = "bg-amber-400";
           if(point.value > 75) barColor = "bg-rose-500";

           return (
            <motion.div
              layoutId={`bar-${i}`} // layoutId helps smoothen the shifting
              key={`${point.timestamp}-${i}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${heightPercentage}%`, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`w-full rounded-t-sm opacity-80 hover:opacity-100 transition-opacity ${barColor}`}
              title={`${point.value.toFixed(0)}ms`}
            />
          );
        })}
      </div>
      
      {/* X-Axis Labels (Simulated) */}
      <div className="flex justify-between w-full mt-2 border-t border-slate-800 pt-1">
          <span className="text-[10px] text-slate-500">40s ago</span>
          <span className="text-[10px] text-slate-500">Live</span>
      </div>
    </div>
  );
};

export default ApiLatencyChart;