import './globals.css';
import Providers from '@/components/Providers';
import { GameSync } from '@/components/GameSync';
import { AmbientFX } from '@/components/fx/AmbientFX';

export const metadata = {
  title: 'Gluttons // Survival Terminal',
  description: 'Finite onchain survival protocol',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers><GameSync/><AmbientFX/>{children}</Providers></body></html>;
}
