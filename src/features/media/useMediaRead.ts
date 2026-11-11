import { useEffect, useState } from 'react'

type ReadState<T> = { key: string; data: T; error: null } | { key: string; data: null; error: unknown }
export function useMediaRead<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<ReadState<T> | null>(null)
  useEffect(() => {
    if (key === null) return
    const controller = new AbortController()
    let active = true
    load(controller.signal).then(
      data => { if (active) setResult({ key, data, error: null }) },
      error => { if (active) setResult({ key, data: null, error }) },
    )
    return () => { active = false; controller.abort() }
  }, [key, load])
  const current = key !== null && result?.key === key ? result : null
  return { data: current?.data ?? null, error: current?.error ?? null, loading: key !== null && !current }
}
