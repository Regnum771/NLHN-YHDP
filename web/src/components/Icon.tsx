// Inline stroke icons (1.8px), decorative: the control that holds one carries the accessible name.
const PATHS: Record<string, string> = {
  home: 'M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',
  chat: 'M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.1A8 8 0 1 1 20 11.5z',
  pencil: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM13.5 6.5l3 3M12 20h8',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M9.5 2.5h5',
  chart: 'M4 20h16M7 20v-7M12 20V6M17 20v-10',
  book: 'M12 6.5C10.5 5.2 8.3 4.8 4 5v13c4.3-.2 6.5.2 8 1.5 1.5-1.3 3.7-1.7 8-1.5V5c-4.3-.2-6.5.2-8 1.5zM12 6.5v13',
  flag: 'M6 21V4h11l-2 4 2 4H6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.9-3.9',
  plus: 'M12 5v14M5 12h14',
  cards: 'M4 8h13v11H4zM7 5h13v11',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  list: 'M4 6h16M4 12h16M4 18h10',
  thumb: 'M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7',
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
}

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}
