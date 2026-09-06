import { ASSETS, SITE } from './constants';

export function resolveUri(uri?: string | null): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) return `${SITE.ipfsGateway}${uri.slice(7)}`;
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`;
  return uri;
}

function decodeDataJson(uri: string): any | null {
  try {
    const comma = uri.indexOf(',');
    if (comma < 0) return null;
    const head = uri.slice(0, comma);
    const body = uri.slice(comma + 1);
    const json = head.includes(';base64') ? atob(body) : decodeURIComponent(body);
    return JSON.parse(json);
  } catch { return null; }
}

export async function metadataImage(tokenUri: string, visualState: number): Promise<string> {
  try {
    let meta: any;
    if (tokenUri.startsWith('data:application/json')) meta = decodeDataJson(tokenUri);
    else {
      const resolved = resolveUri(tokenUri);
      if (!resolved) throw new Error('empty token uri');
      // Some deployments may point tokenURI directly to an image.
      if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(resolved)) return resolved;
      const r = await fetch(resolved, { cache: 'no-store' });
      if (!r.ok) throw new Error(`metadata ${r.status}`);
      meta = await r.json();
    }
    const image = resolveUri(meta?.image || meta?.image_url || meta?.animation_url);
    if (image) return image;
  } catch {}
  if (visualState === 2) return ASSETS.fallbackFresh;
  if (visualState === 3) return ASSETS.fallbackRotten;
  return ASSETS.fallbackAlive;
}
