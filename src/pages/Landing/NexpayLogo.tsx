import { useId } from 'react'

/** Isotipo de NexPay: hexágono dorado con la N. */
function NexpayLogo({ size = 32 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6e3a9" />
          <stop offset="55%" stopColor="#d4a64a" />
          <stop offset="100%" stopColor="#8a6424" />
        </linearGradient>
      </defs>
      <path d="M16 1.8 28.3 8.9v14.2L16 30.2 3.7 23.1V8.9Z" fill="none" stroke={`url(#${id})`} strokeWidth="2.4" />
      <path d="M11 22V10l10 12V10" fill="none" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default NexpayLogo
