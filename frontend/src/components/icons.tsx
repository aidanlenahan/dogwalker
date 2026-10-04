import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function PawIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <ellipse cx="6" cy="9.5" rx="2.1" ry="2.6" />
      <ellipse cx="10" cy="5.5" rx="2.1" ry="2.7" />
      <ellipse cx="14.5" cy="5.5" rx="2.1" ry="2.7" />
      <ellipse cx="18.4" cy="9.6" rx="2.1" ry="2.6" />
      <path d="M12.2 11c2.3 0 4.6 2.6 5.3 5 .6 2.2-.9 3.6-2.6 3.4-1-.1-1.8-.6-2.7-.6s-1.7.5-2.7.6c-1.7.2-3.2-1.2-2.6-3.4.7-2.4 3-5 5.3-5z" />
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

export function DogIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 5.2C10 3.9 8.9 3 7.7 3 6.1 3 4.6 4.5 4.3 6.5L3.5 11c-.2 1 .6 1.8 1.6 1.6L7 12" />
      <path d="M14 5.2C14 3.9 15.1 3 16.3 3c1.6 0 3.1 1.5 3.4 3.5l.8 4.5c.2 1-.6 1.8-1.6 1.6L17 12" />
      <path d="M7 10.5V15a5 5 0 0 0 10 0v-4.5C17 7.5 15 5 12 5s-5 2.5-5 5.5z" />
      <path d="M10.5 16.5h3" />
      <circle cx="10" cy="11.5" r=".6" fill="currentColor" />
      <circle cx="14" cy="11.5" r=".6" fill="currentColor" />
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
