import { createPublicClient, fallback, http } from 'viem';
import { ACTIVE_CHAIN } from '@/lib/constants';

const urls=[process.env.RPC_URL,process.env.RPC_FALLBACK_URL].filter(Boolean) as string[];
if(!urls.length){
  if(process.env.NODE_ENV==='production') throw new Error('SERVER_RPC_NOT_CONFIGURED');
  console.warn('Gluttons read service: RPC_URL is not configured; development will use the public chain fallback.');
}
const transports=(urls.length?urls:ACTIVE_CHAIN.rpcUrls.default.http).map(u=>http(u,{timeout:12_000,retryCount:0}));
export const serverClient=createPublicClient({chain:ACTIVE_CHAIN,transport:transports.length>1?fallback(transports,{rank:false}):transports[0]});
