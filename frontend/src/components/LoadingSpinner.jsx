export default function LoadingSpinner({ size = 'md', label }) {
  const dim = size === 'sm' ? 18 : size === 'lg' ? 40 : 28
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '60px 20px' }}>
      <div
        className="animate-spin"
        style={{ width: dim, height: dim, borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#00c853' }}
      />
      {label && <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>{label}</p>}
    </div>
  )
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="skeleton" style={{ height: 16, width: '60%' }} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 12, width: i === 0 ? '40%' : '55%' }} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}
