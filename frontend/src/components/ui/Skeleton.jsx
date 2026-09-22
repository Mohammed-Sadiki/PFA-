import { clsx } from 'clsx'

export default function Skeleton({ className, lines = 1 }) {
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'skeleton h-4 rounded',
              i === lines - 1 && 'w-3/4',
              className
            )}
          />
        ))}
      </div>
    )
  }
  return (
    <div className={clsx('skeleton rounded', className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-3 gap-3 mt-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-12 rounded" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}
