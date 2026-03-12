import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

function Skeleton({
  className,
  width,
  height,
  circle,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-slate-100 dark:bg-slate-800",
        circle ? "rounded-full" : "rounded-md",
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}

export default Skeleton;