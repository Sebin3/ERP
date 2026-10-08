import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function EmptyState({ title, description, icon: Icon = Inbox }: { title: string; description: string; icon?: LucideIcon }) {
  return <div className="grid min-h-72 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-surface-muted text-text-muted"><Icon size={19} strokeWidth={1.5} /></span><h2 className="mt-4 text-base font-semibold text-text">{title}</h2><p className="mt-1.5 text-sm leading-6 text-text-muted">{description}</p></div></div>
}
