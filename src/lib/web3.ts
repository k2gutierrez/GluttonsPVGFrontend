'use client';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
// import { curtis } from './constants';
import { curtis } from 'wagmi/chains';
export const wagmiConfig = getDefaultConfig({ appName:'Gluttons', projectId:process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id', chains:[curtis], ssr:true });
