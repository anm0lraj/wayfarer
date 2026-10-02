import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Thin styled wrapper over Radix DropdownMenu (keyboard navigation, typeahead and focus return come for free). */
export function Menu({ trigger, children, align = 'end' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={6} className="z-[55] min-w-48 rounded-lg border border-border bg-surface p-1 text-fg shadow-lg">
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function MenuItem({ children, onSelect, danger, disabled, icon }: { children: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean; icon?: ReactNode }) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex min-h-touch cursor-pointer select-none items-center gap-2.5 rounded-md px-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2',
        danger && 'text-error',
      )}
    >
      {icon && <span aria-hidden className="text-fg-muted">{icon}</span>}
      {children}
    </DropdownMenu.Item>
  )
}

export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{children}</DropdownMenu.Label>
)

export const MenuSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-border" />
