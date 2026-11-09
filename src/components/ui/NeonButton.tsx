import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import type { LinkProps } from 'react-router'

type SharedProps = {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

type ButtonProps = SharedProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  to?: never
  loading?: boolean
}

type NavigationProps = SharedProps & Omit<LinkProps, 'children' | 'className'> & {
  disabled?: never
  loading?: never
}

export function NeonButton(props: ButtonProps | NavigationProps) {
  if (props.to !== undefined) {
    const { variant = 'primary', className = '', children, ...linkProps } = props
    return <Link {...linkProps} className={`button button--${variant} ${className}`}>{children}</Link>
  }

  const { variant = 'primary', className = '', children, loading = false, disabled = false, type = 'button', ...buttonProps } = props
  return (
    <button {...buttonProps} type={type} className={`button button--${variant} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading && <><span className="button-spinner" aria-hidden="true" /><span className="sr-only">Carregando: </span></>}
      {children}
    </button>
  )
}
