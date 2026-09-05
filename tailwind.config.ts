import type { Config } from 'tailwindcss';
export default { content:['./src/**/*.{js,ts,jsx,tsx,mdx}'], theme:{extend:{fontFamily:{mono:['var(--font-mono)','monospace'],display:['var(--font-display)','sans-serif']},boxShadow:{terminal:'0 0 0 1px rgba(255,82,35,.12),0 24px 80px rgba(0,0,0,.45)'}}}, plugins:[] } satisfies Config;
