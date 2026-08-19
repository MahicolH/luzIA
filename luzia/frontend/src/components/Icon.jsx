export default function Icon({ name }) {
  const icons = {
    plus: <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
    send: <path d="M4 12 20 4 13 20l-2-7-7-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />,
    clip: <path d="M21 11.5 12.3 20a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-7.8 7.8a1.5 1.5 0 0 1-2.1-2.1l7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    headset: <g fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /></g>,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
}
