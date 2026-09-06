import './globals.css';
import Providers from '@/components/Providers';
import { GameSync } from '@/components/GameSync';
import { AmbientFX } from '@/components/fx/AmbientFX';

export const metadata = { title: 'Gluttons // Survival Terminal', description: 'Finite onchain survival protocol' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers><GameSync/><AmbientFX/>{children}</Providers></body></html>;
}
