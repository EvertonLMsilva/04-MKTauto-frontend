import type { FormEvent } from 'react'
export function focusCommandError(event: FormEvent<HTMLFormElement>, errors: Record<string, string>) {
  const first = Object.keys(errors)[0]
  const input = first && event.currentTarget.elements.namedItem(first)
  if (input instanceof HTMLElement) input.focus()
}
