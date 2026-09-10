'use client';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { fallback, http } from 'viem';
import { ACTIVE_CHAIN, CURTIS_RPC_URLS, ETHEREUM_RPC_URLS } from './constants';
import { curtis } from "wagmi/chains";


const urls = ACTIVE_CHAIN.id === 1 ? ETHEREUM_RPC_URLS : CURTIS_RPC_URLS;
const readTransport = fallback(
  urls.map(url => http(url, { retryCount: 0, timeout: 8_000 })),
  { rank: false },
);

export const wagmiConfig = getDefaultConfig({
  appName: 'Gluttons',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [curtis],
  transports: { [curtis.id]: readTransport },
  ssr: true,
});
