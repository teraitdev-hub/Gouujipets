import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const LoadingSkeleton = ({ className, ...props }: LoadingSkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gray-200 dark:bg-slate-800",
        className
      )}
      {...props}
    />
  );
};

export const CardSkeleton = () => (
  <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 w-full">
    <div className="flex items-center space-x-4">
      <LoadingSkeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <LoadingSkeleton className="h-4 w-1/3" />
        <LoadingSkeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="mt-6 space-y-3">
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-5/6" />
      <LoadingSkeleton className="h-4 w-4/6" />
    </div>
  </div>
);
