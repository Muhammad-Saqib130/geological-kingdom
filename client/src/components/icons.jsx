// Line icons (24px grid, currentColor). Decorative by default; pass a title to label one.
function Icon({ title, children, className = 'h-5 w-5', strokeWidth = 1.5, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...props}>
      {title && <title>{title}</title>}
      {children}
    </svg>
  )
}

export const SearchIcon = (p) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Icon>
export const BagIcon = (p) => <Icon {...p}><path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Icon>
export const UserIcon = (p) => <Icon {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5" /></Icon>
export const MenuIcon = (p) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
export const CloseIcon = (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
export const ChevronLeft = (p) => <Icon {...p}><path d="m15 5-7 7 7 7" /></Icon>
export const ChevronRight = (p) => <Icon {...p}><path d="m9 5 7 7-7 7" /></Icon>
export const ArrowRight = (p) => <Icon {...p}><path d="M4 12h15M14 7l5 5-5 5" /></Icon>
export const PlusIcon = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
export const MinusIcon = (p) => <Icon {...p}><path d="M5 12h14" /></Icon>
export const ZoomIcon = (p) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M11 8v6M8 11h6" /></Icon>
export const FilterIcon = (p) => <Icon {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Icon>
export const CheckIcon = (p) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
export const CertificateIcon = (p) => (
  <Icon {...p}><path d="M6 3.5h12v13H6z" /><path d="M9 7.5h6M9 10.5h6M9 13.5h3" /><circle cx="16.5" cy="17.5" r="2.5" /><path d="m15.2 19.6-.7 2.4 2-1 2 1-.7-2.4" /></Icon>
)
export const LeafIcon = (p) => <Icon {...p}><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path d="M5 19 13 11" /></Icon>
export const ShieldIcon = (p) => <Icon {...p}><path d="M12 3 5 6v5.5c0 4.2 2.9 7.8 7 9 4.1-1.2 7-4.8 7-9V6z" /><path d="m9 12 2 2 4-4" /></Icon>
export const TruckIcon = (p) => <Icon {...p}><path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></Icon>
export const LoupeIcon = (p) => <Icon {...p}><circle cx="10" cy="10" r="6" /><path d="m14.5 14.5 5.5 5.5" /><path d="M7.5 9.5 10 7l2.5 2.5L10 13z" /></Icon>
export const GemIcon = (p) => <Icon {...p}><path d="M7 4h10l4 5-9 11L3 9z" /><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" /></Icon>
export const StarIcon = ({ filled = true, ...p }) => (
  <Icon {...p} strokeWidth={1.2}><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" fill={filled ? 'currentColor' : 'none'} /></Icon>
)
export const WhatsAppIcon = ({ className = 'h-5 w-5', title }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
    {title && <title>{title}</title>}
    <path d="M12.04 2.5a9.43 9.43 0 0 0-8.1 14.27L2.5 21.5l4.86-1.4A9.44 9.44 0 1 0 12.04 2.5zm0 17.2a7.77 7.77 0 0 1-3.96-1.08l-.28-.17-2.88.83.85-2.8-.19-.29a7.77 7.77 0 1 1 6.46 3.51zm4.27-5.82c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.53.12-.15.23-.6.76-.74.92-.14.15-.27.17-.5.06a6.35 6.35 0 0 1-3.15-2.76c-.24-.41.24-.38.68-1.27.08-.15.04-.29-.02-.4-.06-.12-.53-1.27-.72-1.74-.19-.46-.38-.39-.53-.4h-.45a.86.86 0 0 0-.62.29 2.6 2.6 0 0 0-.81 1.93 4.52 4.52 0 0 0 .95 2.4 10.34 10.34 0 0 0 3.96 3.5c1.47.64 2.05.69 2.78.58.45-.07 1.38-.56 1.57-1.11.2-.55.2-1.02.14-1.12-.06-.1-.21-.16-.44-.27z" />
  </svg>
)
