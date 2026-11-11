import { useId } from 'react'
import type { Draft } from '../contracts/fakeCampaignCommands'

export interface FieldSpec { key: string; label: string; type?: 'textarea' | 'url' | 'number'; options?: readonly string[]; hint?: string }
export function CommandFields({ fields, draft, errors, onChange }: { fields: FieldSpec[]; draft: Draft; errors: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const prefix = useId()
  return <div className="command-fields">{fields.map(field => {
    const id = `${prefix}-${field.key}`, error = errors[field.key]
    const shared = { id, name: field.key, value: draft[field.key] ?? '', 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : field.hint ? `${id}-hint` : undefined, onChange: (event: { target: { value: string } }) => onChange(field.key, event.target.value) }
    return <div key={field.key} className={field.type === 'textarea' ? 'command-field-wide' : ''}>
      <label htmlFor={id}>{field.label}</label>
      {field.options ? <select {...shared}><option value="">Selecione…</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'textarea' ? <textarea {...shared} rows={4} spellCheck={false} /> : <input {...shared} type={field.type === 'number' ? 'text' : field.type ?? 'text'} inputMode={field.type === 'number' ? 'numeric' : undefined} autoComplete="off" />}
      {field.hint && <p className="campaign-note" id={`${id}-hint`}>{field.hint}</p>}
      {error && <p className="campaign-validation" id={`${id}-error`}>{error}</p>}
    </div>
  })}</div>
}
