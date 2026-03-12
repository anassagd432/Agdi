"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt: string;
  fallback: string; // Initials like "JD"
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export default function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const [status, setStatus] = useState<"loading" | "error" | "loaded">(
    src ? "loading" : "error"
  );

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && status !== "error" && (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: status === "loaded" ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          src={src}
          alt={alt}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className="aspect-square h-full w-full object-cover"
        />
      )}

      {/* Fallback displayed when loading or error */}
      {status !== "loaded" && (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-medium">
          {fallback.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}