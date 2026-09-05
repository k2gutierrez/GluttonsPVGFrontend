'use client';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { Provider as JotaiProvider } from 'jotai';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { wagmiConfig } from '@/lib/web3';
export default function Providers({children}:{children:React.ReactNode}){const [q]=useState(()=>new QueryClient());return <WagmiProvider config={wagmiConfig}><QueryClientProvider client={q}><JotaiProvider><RainbowKitProvider theme={darkTheme({accentColor:'#ff4b1f',accentColorForeground:'white',borderRadius:'small'})}>{children}<Toaster richColors theme="dark" /></RainbowKitProvider></JotaiProvider></QueryClientProvider></WagmiProvider>}
