import type { ReactNode } from 'react'
import { SegmentedControl } from '../ui'

export function PageHeader({ title, description, viewControl, actions }: { title: string; description?: string; viewControl?: ReactNode; actions?: ReactNode }) {
  return <div className="flex items-start justify-between gap-6 max-md:flex-col max-md:gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-4"><h1 className="m-0 text-[24px] font-semibold tracking-tight text-text">{title}</h1>{viewControl ? <span className="hidden h-6 w-px bg-border sm:block" /> : null}{viewControl}</div>{description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{description}</p> : null}</div>{actions ? <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 max-md:w-full max-md:[&>button]:flex-1 max-md:[&>button]:w-full">{actions}</div> : null}</div>
}

export function ViewToggle({ value, onChange }: { value: 'list' | 'grid'; onChange: (value: 'list' | 'grid') => void }) {
  return <SegmentedControl ariaLabel="Modo de visualización" options={[{ value: 'list', label: 'Lista' }, { value: 'grid', label: 'Grilla' }]} value={value} onChange={onChange} />
}

export function PageContent({ children }: { children: ReactNode }) {
  return <div className="mt-7 max-md:mt-6">{children}</div>
}
