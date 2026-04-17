/**
 * Skeleton genérico para o fallback do <Suspense>.
 * Usa layout neutro (header + linhas + cards) que combina com a maioria das páginas.
 * Sem shimmer pesado: só pulse CSS para manter leve.
 */
const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`bg-zinc-800/60 rounded-lg animate-pulse ${className}`} />
);

export const PageSkeleton = () => (
  <div className="min-h-screen bg-black text-white px-5 pt-12 pb-28">
    {/* Header */}
    <div className="flex items-center justify-between mb-8">
      <Bar className="h-9 w-32" />
      <Bar className="h-10 w-10 rounded-full" />
    </div>

    {/* Content blocks */}
    <div className="space-y-3 mb-6">
      <Bar className="h-4 w-2/3" />
      <Bar className="h-4 w-1/2" />
    </div>

    <div className="space-y-3">
      <Bar className="h-24 w-full" />
      <Bar className="h-24 w-full" />
      <Bar className="h-24 w-full" />
    </div>
  </div>
);

export default PageSkeleton;
