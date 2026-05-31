'use client'

interface AvatarProps {
  displayName?: string | null
  avatarUrl?: string | null
  avatarColor?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ displayName, avatarUrl, avatarColor, size = 'sm' }: AvatarProps) {
  const initials = displayName
    ? displayName
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  const color = avatarColor || '#6366f1'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName ?? 'User'}
        className={`${SIZES[size]} rounded-full object-cover flex-shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${SIZES[size]} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ backgroundColor: color + '33', color }}
    >
      {initials}
    </div>
  )
}
