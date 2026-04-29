interface StarRatingProps {
  stars: number  // 1–5
  size?: number  // px, default 12
}

export function StarRating({ stars, size = 12 }: StarRatingProps) {
  return (
    <div style={{ display: 'flex', gap: '1px' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          data-star={i < stars ? 'filled' : 'empty'}
          style={{
            fontSize: `${size}px`,
            color: i < stars ? '#fbbf24' : '#6b7280',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}
