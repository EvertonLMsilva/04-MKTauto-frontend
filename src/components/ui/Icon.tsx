import type { SVGProps } from 'react'

const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  layers: 'M12 3 2 8l10 5 10-5-10-5Z M2 12l10 5 10-5 M2 16l10 5 10-5',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  code: 'm8 5-6 7 6 7 m8-14 6 7-6 7 M14 3l-4 18',
  check: 'm5 12 4 4L19 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M6 18 18 6',
  plug: 'M8 3v5 M16 3v5 M6 8h12v3a6 6 0 0 1-12 0V8Z M12 17v4',
  monitor: 'M3 4h18v13H3z M8 21h8 M12 17v4',
  campaign: 'm4 10 14-5v14L4 14z M4 10H2v4h2 M6 15l2 6h3l-2-5',
  media: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M7 7h.01',
  publish: 'm3 10 18-7-7 18-3-8-8-3Z M11 13 21 3',
  queue: 'M8 5h13 M8 12h13 M8 19h13 M3 5h.01 M3 12h.01 M3 19h.01',
  processor: 'M7 7h10v10H7z M10 1v6 M14 1v6 M10 17v6 M14 17v6 M1 10h6 M1 14h6 M17 10h6 M17 14h6',
  chart: 'M4 21V11h4v10 M10 21V3h4v18 M16 21v-7h4v7',
  lock: 'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4 M12 15v2',
} as const

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>
}
