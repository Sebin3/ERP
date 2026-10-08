import { cn } from '../../utils'

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const sizes = { sm: 'size-7 text-[10px]', md: 'size-8 text-xs', lg: 'size-11 text-sm' }
  return <span className={cn('grid shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent', sizes[size], className)} aria-label={name}>{initials}</span>
}
