import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '../../utils'
import { IconButton } from '../ui'

export function SidebarHeader({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <header className="flex min-h-0 shrink-0 items-center justify-between gap-2 px-1 pb-5 group-data-[collapsed=true]:flex-col group-data-[collapsed=true]:justify-start group-data-[collapsed=true]:gap-2 group-data-[collapsed=true]:px-0">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden group-data-[collapsed=true]:size-10 group-data-[collapsed=true]:flex-none group-data-[collapsed=true]:justify-center">
        <span className="grid size-[26px] shrink-0 grid-cols-2 grid-rows-2 place-content-center gap-0.5 rounded-[8px] bg-accent">
          <span className="size-[5px] rounded-[2px] bg-white" /><span className="size-[5px] rounded-[2px] bg-white" /><span className="size-[5px] rounded-[2px] bg-white" /><span className="size-[5px] rounded-[2px] bg-white" />
        </span>
        <span className="min-w-0 truncate text-[15px] font-bold tracking-tight text-text group-data-[collapsed=true]:hidden md:max-lg:hidden">EnterpriseCloud</span>
      </div>
      <IconButton className={cn('!hidden lg:!inline-grid group-data-[collapsed=true]:size-7', collapsed && 'size-7')} aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'} onClick={onToggle}>
        {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
      </IconButton>
    </header>
  )
}
