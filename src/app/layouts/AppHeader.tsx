import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useSession } from '../providers/session'
import { SearchField } from '@/components/ui/Input'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const iconButton = 'grid min-h-touch min-w-touch place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg'

/** Sticky top bar: logo (phone), global destination search (tablet/desktop), notifications, account. */
export function AppHeader() {
  const session = useSession()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 pt-safe backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-h-touch items-center gap-2 font-bold sm:hidden">
          <img src="/icon.svg" alt="" className="size-7 rounded-md" /> Wayfarer
        </Link>
        <form role="search" onSubmit={onSearch} className="hidden w-full max-w-md sm:block">
          <SearchField label="Search destinations" placeholder="Where do you want to go?" value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-full bg-surface-2 pl-10" />
        </form>
        <div className="ml-auto flex items-center gap-1">
          <Link to="/explore" aria-label="Search destinations" className={`${iconButton} sm:hidden`}><Search aria-hidden className="size-5" /></Link>
          <ThemeToggle />
          <Link to="/notifications" aria-label="Notifications" className={iconButton}><Bell aria-hidden className="size-5" /></Link>
          {/* Profile lives in the primary navigation only; the header just offers Sign in when signed out. */}
          {!session && <Link to="/signin" className="ml-1 min-h-touch content-center rounded-md px-3 font-semibold text-primary hover:bg-surface-2">Sign in</Link>}
        </div>
      </div>
    </header>
  )
}
