import GemCard from './GemCard.jsx'

export function GemGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square bg-ivory-200" />
          <div className="mt-4 h-3 w-1/3 bg-ivory-200" />
          <div className="mt-2 h-5 w-2/3 bg-ivory-200" />
        </div>
      ))}
    </div>
  )
}

export default function GemGrid({ gems }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {gems.map((g) => <GemCard key={g.id} gem={g} />)}
    </div>
  )
}
