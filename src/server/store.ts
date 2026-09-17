import { Redis } from '@upstash/redis';
import { ACTIVE_CHAIN, CONTRACTS } from '@/lib/constants';

const url=process.env.UPSTASH_REDIS_REST_URL;
const token=process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis=url&&token?new Redis({url,token}):null;
export const NS=`gluttons:${ACTIVE_CHAIN.id}:${CONTRACTS.gameEngine.toLowerCase()}`;
export const K={
 protocol:`${NS}:protocol`,
 tokens:`${NS}:tokens`,
 wallet:(a:string)=>`${NS}:wallet:${a.toLowerCase()}`,
 lastBlock:`${NS}:lastBlock`,
 lastHash:`${NS}:lastHash`,
 initialized:`${NS}:initialized`,
 communities:`${NS}:communities`,
 stadium:`${NS}:stadium`,
 endgame:`${NS}:endgame`,
 settlementBase:`${NS}:settlement:base`,
 winnerShares:`${NS}:settlement:winners`,
 claimedShares:`${NS}:settlement:claimed`,
 tokenStateBlock:`${NS}:tokenStateBlock`,
 communityVersion:`${NS}:communityVersion`,
 touchQueue:`${NS}:touchQueue`,
 poisons:`${NS}:lb:poisons`,
 feeds:`${NS}:lb:feeds`,
 rpcCache:(name:string)=>`${NS}:rpc-cache:${name}`,
 rate:(scope:string,key:string)=>`${NS}:rate:${scope}:${key}`,
};
export function requireStore(){if(!redis)throw new Error('READ_STORE_NOT_CONFIGURED');return redis;}
