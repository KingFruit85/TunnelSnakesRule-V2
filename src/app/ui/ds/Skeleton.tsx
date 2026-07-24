export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-muted-200 ${className}`} />;
}
