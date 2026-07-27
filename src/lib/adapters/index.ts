/**
 * index.ts -- registers every platform adapter with the dispatch engine.
 */

import { registerAdapter, PlatformAdapter } from '../campaignDispatchEngine';
import { metaAdapter } from './metaAdapter';
import { googleAdapter } from './googleAdapter';
import { linkedinAdapter } from './linkedinAdapter';
import { tiktokAdapter } from './tiktokAdapter';
import { pinterestAdapter } from './pinterestAdapter';
import { xAdapter } from './xAdapter';
import { programmaticAdapter } from './programmaticAdapter';

const adapters: PlatformAdapter[] = [
  metaAdapter,
  googleAdapter,
  linkedinAdapter,
  tiktokAdapter,
  pinterestAdapter,
  xAdapter,
  programmaticAdapter,
];

let registered = false;

/** Idempotent: safe to call multiple times (e.g. hot reload in dev). */
export function registerAllAdapters() {
  if (registered) return;
  adapters.forEach(registerAdapter);
  registered = true;
}

export { metaAdapter, googleAdapter, linkedinAdapter, tiktokAdapter, pinterestAdapter, xAdapter, programmaticAdapter };
