export function requireTrustedOrigin(req: Request) {
  const configured=(process.env.APP_ORIGIN||'').replace(/\/$/,'');
  if(!configured) return;
  const origin=(req.headers.get('origin')||'').replace(/\/$/,'');
  if(origin && origin!==configured) throw new Error('UNTRUSTED_ORIGIN');
}
