import { useEffect, useState } from 'react'
import { clock, useClockStore } from '@/services/clock/clock'

/** Current time from the clock service (honours the demo date simulator); re-renders every minute. */
export function useNow(): Date {
  const simulated = useClockStore((s) => s.simulatedNow)
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  void simulated // subscribe so simulator changes re-render
  return clock.now()
}
