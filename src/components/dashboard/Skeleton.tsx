import type { HTMLAttributes } from "react";

const base = "animate-pulse bg-slate-200";

export function SkeletonCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`${base} rounded-xl ${className}`} {...props} />;
}

export function SkeletonRing({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`${base} h-20 w-20 rounded-full ${className}`} {...props} />;
}

export function SkeletonBar({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`${base} h-2.5 w-full rounded-full ${className}`} {...props} />;
}

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> { lines?: number }
export function SkeletonText({ lines = 3, className = "", ...props }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {Array.from({ length: Math.max(0, lines) }, (_, index) => (
        <div key={index} aria-hidden="true" className={`${base} h-3 rounded ${index === lines - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}
