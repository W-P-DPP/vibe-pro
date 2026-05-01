import { Outlet } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { MoonStarIcon, SunMediumIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AppLayout() {
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border/70 bg-background/92 px-4 backdrop-blur-md md:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold text-foreground">Todo</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full px-3"
          onClick={toggleTheme}
        >
          {resolvedTheme === 'dark' ? (
            <SunMediumIcon className="size-4" />
          ) : (
            <MoonStarIcon className="size-4" />
          )}
        </Button>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  )
}
