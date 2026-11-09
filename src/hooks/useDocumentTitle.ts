import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `MKTAuto · ${title}`
  }, [title])
}
