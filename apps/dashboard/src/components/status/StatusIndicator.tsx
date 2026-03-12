"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type StatusType = "operational" | "degraded" | "downtime" | "maintenance";

interface StatusIndicatorProps {
  status: StatusType;
  className?: string;
  showLabel?: boolean;
}

const statusConfig = {
  operational: {
    color: "bg-emerald-500",
    shadow: "shadow-emerald-500/50",
    label: "Operational",
    textColor: "text-emerald-500",
  },
  degraded: {
    color: "bg-amber-500",
    shadow: "shadow-amber-500/50",
    label: "Degraded Performance",
    textColor: "text-amber-500",
  },
  downtime: {
    color: "bg-rose-500",
    shadow: "shadow-rose-500/50",
    label: "Major Outage",
    textColor: "text-rose-500",
  },
  maintenance: {
    color: "bg-blue-500",
    shadow: "shadow-blue-500/50",
    label: "Maintenance",
    textColor: "text-blue-500",
  },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  className,
  showLabel = true,
}) => {
  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2", className)} aria-label={`System status: ${config.label}`}>
      <div className="relative flex h-3 w-3">
        {status === "operational" && (
          <motion.span
            animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75",
              config.color
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-3 w-3 rounded-full",
            config.color,
            config.shadow,
            status !== "operational" && "shadow-none"
          )}
        />
      </div>
      {showLabel && (
        <span className={cn("text-sm font-medium", config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;