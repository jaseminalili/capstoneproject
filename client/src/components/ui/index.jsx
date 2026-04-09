import { X } from 'lucide-react'

// ── Avatar ─────────────────────────────────────────────────────────────────────
export function Avatar({ user, size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base', xl: 'w-14 h-14 text-lg' }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none ${className}`}
      style={{ background: user?.color || '#3B82F6' }}
      title={user?.name}
    >
      {user?.avatar || user?.name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

// ── Badge ──────────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  active:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  planning:    'bg-blue-100 text-blue-700 border-blue-200',
  completed:   'bg-gray-100 text-gray-600 border-gray-200',
  on_hold:     'bg-amber-100 text-amber-700 border-amber-200',
  cancelled:   'bg-red-100 text-red-600 border-red-200',
  todo:        'bg-gray-100 text-gray-600 border-gray-200',
  backlog:     'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  in_review:   'bg-violet-100 text-violet-700 border-violet-200',
  done:        'bg-emerald-100 text-emerald-700 border-emerald-200',
}
const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-green-100 text-green-700 border-green-200',
}
const TYPE_STYLES = {
  task:        'bg-blue-100 text-blue-700 border-blue-200',
  bug:         'bg-red-100 text-red-700 border-red-200',
  feature:     'bg-purple-100 text-purple-700 border-purple-200',
  improvement: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  story:       'bg-pink-100 text-pink-700 border-pink-200',
  epic:        'bg-indigo-100 text-indigo-700 border-indigo-200',
}

export function StatusBadge({ value }) {
  const style = STATUS_STYLES[value] || 'bg-gray-100 text-gray-600 border-gray-200'
  return <span className={`badge border ${style}`}>{(value || '').replace(/_/g, ' ')}</span>
}

export function PriorityBadge({ value }) {
  const style = PRIORITY_STYLES[value] || 'bg-gray-100 text-gray-600 border-gray-200'
  return <span className={`badge border ${style} uppercase text-[10px] tracking-wide`}>{value}</span>
}

export function TypeBadge({ value }) {
  const style = TYPE_STYLES[value] || 'bg-gray-100 text-gray-600 border-gray-200'
  return <span className={`badge border ${style}`}>{value}</span>
}

export function RoleBadge({ value }) {
  const styles = {
    owner:  'bg-purple-100 text-purple-700 border-purple-200',
    admin:  'bg-blue-100 text-blue-700 border-blue-200',
    member: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return <span className={`badge border ${styles[value] || styles.member} uppercase text-[10px] tracking-wide`}>{value}</span>
}

// ── Progress bar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, color = '#3B82F6', height = 6 }) {
  return (
    <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, subtitle, children, size = 'md' }) {
  if (!isOpen) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full ${widths[size]} bg-white rounded-2xl shadow-modal`} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-4">
              <X size={18} />
            </button>
          </div>
          {/* Body */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 28, className = '' }) {
  return (
    <div
      className={`rounded-full border-[3px] border-gray-200 border-t-blue-600 animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={36} />
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon size={28} className="text-gray-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-5 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', variant = 'danger' }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-modal p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Form field wrapper ─────────────────────────────────────────────────────────
export function Field({ label, error, required, children }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
}

export { STATUS_STYLES, PRIORITY_STYLES }
