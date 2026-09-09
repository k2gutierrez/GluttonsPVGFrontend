export const rpcWait = (ms:number) => new Promise(resolve=>setTimeout(resolve,ms));

export async function readContractRetry(client:any, request:any, attempts=3) {
  let last:unknown;
  for (let i=0;i<attempts;i++) {
    try { return await client.readContract(request); }
    catch (e) { last=e; if (i<attempts-1) await rpcWait(180*(i+1)); }
  }
  throw last;
}

/**
 * Curtis-safe read helper. Try deployless multicall first; if the endpoint
 * rejects the payload, bisect it until direct eth_call is used for singletons.
 */
export async function resilientMulticall(client:any, contracts:any[]):Promise<any[]> {
  if (!contracts.length) return [];
  try { return await client.multicall({allowFailure:true,deployless:true,contracts}); }
  catch (error) {
    if (contracts.length===1) {
      try { return [{status:'success',result:await readContractRetry(client,contracts[0],3)}]; }
      catch (e) { return [{status:'failure',error:e ?? error}]; }
    }
    const mid=Math.ceil(contracts.length/2);
    const [left,right]=await Promise.all([
      resilientMulticall(client,contracts.slice(0,mid)),
      resilientMulticall(client,contracts.slice(mid)),
    ]);
    return [...left,...right];
  }
}
