/** Ícones de marca (lucide-react 1.x não inclui logos). SVGs simplificados, decorativos. */
type P = React.SVGProps<SVGSVGElement>

export const FacebookIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.6V21h2.9Z" />
  </svg>
)
export const InstagramIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
  </svg>
)
export const TwitterIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M22 5.8c-.7.3-1.5.6-2.4.7a4.1 4.1 0 0 0 1.8-2.3c-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.7 3.3 4.1-.6.2-1.2.2-1.9.1a4.1 4.1 0 0 0 3.8 2.8A8.2 8.2 0 0 1 2 18.3 11.6 11.6 0 0 0 8.3 20c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2Z" />
  </svg>
)
export const LinkedinIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M6.9 8.6H3.6V20h3.3V8.6ZM5.2 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 13.3c0-3.1-1.7-4.9-4.3-4.9-1.6 0-2.6.9-3 1.6V8.6H9.9V20h3.3v-5.8c0-1.5.4-2.9 2.2-2.9 1.8 0 1.8 1.6 1.8 3V20h3.2v-6.7Z" />
  </svg>
)
export const YoutubeIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...p}>
    <rect x="2.8" y="5.5" width="18.4" height="13" rx="4" />
    <path d="m10.3 9.3 4.6 2.7-4.6 2.7V9.3Z" fill="currentColor" />
  </svg>
)
export const GoogleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" />
    <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z" />
  </svg>
)
export const FacebookBrandIcon = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    <path fill="#3b5ca8" d="M13.5 22v-8.4h2.8l.4-3.3h-3.2V8.2c0-1 .3-1.6 1.7-1.6h1.7V3.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.4v3.3h2.8V22h3.3Z" />
  </svg>
)
export const ThankYouIcon = (p: P) => (
  <svg viewBox="0 0 80 84" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M6 34 40 8l34 26v44H6V34Z" />
    <path d="M6 78l26-22M74 78 48 56M6 34l34 24 34-24" />
    <rect x="14" y="16" width="52" height="30" rx="2" fill="#241612" />
    <text x="40" y="29" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="inherit" fill="currentColor" stroke="none">THANK</text>
    <text x="40" y="41" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="inherit" fill="currentColor" stroke="none">YOU</text>
    <path d="M36 8a4 4 0 0 1 8 0" />
  </svg>
)
