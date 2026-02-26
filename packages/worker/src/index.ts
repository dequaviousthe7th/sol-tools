interface Env {
  STATS: KVNamespace;
  HELIUS_API_KEY: string;
  ADMIN_TOKEN: string;
  ENVIRONMENT: string;
  TREASURY_ADDRESS: string;
  SOLANA_TRACKER_API_KEY: string;
}

interface GlobalStats {
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  totalWallets: number;
}

interface WalletStats {
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  uses: number;
}

interface StatsBody {
  solReclaimed: number;
  accountsClosed: number;
  wallet: string;
  signatures?: string[];
}

interface RecentReclaim {
  wallet: string;
  solReclaimed: number;
  accountsClosed: number;
  timestamp: number;
  signatures?: string[];
}

interface DetailedReclaim {
  wallet: string;
  solReclaimed: number;
  accountsClosed: number;
  signatures: string[];
  timestamp: number;
}

interface DailyViews {
  total: number;
  pages: Record<string, number>;
  countries: Record<string, number>;
}

interface DailyReclaims {
  count: number;
  sol: number;
  accounts: number;
}

interface AdminDashboardData {
  activeVisitors: number;
  globalStats: GlobalStats;
  todayViews: DailyViews;
  todayReclaims: DailyReclaims;
  weekReclaims: DailyReclaims;
  monthReclaims: DailyReclaims;
  socialClicks: Record<string, number>;
  recentReclaims: DetailedReclaim[];
}

const MAX_RECENT = 10;
const MAX_HISTORY = 200;
const ALLOWED_SOCIAL_BUTTONS = new Set(['github', 'x', 'share-x', 'share-burn', 'built-by']);

// Allowed JSON-RPC methods for the proxy
const ALLOWED_METHODS = new Set([
  'getBalance',
  'getAccountInfo',
  'getParsedTokenAccountsByOwner',
  'getTokenAccountsByOwner',
  'getLatestBlockhash',
  'sendTransaction',
  'simulateTransaction',
  'getSignatureStatuses',
  'getTransaction',
  'getSlot',
  'getBlockHeight',
  'getMinimumBalanceForRentExemption',
  'getMultipleAccounts',
  'getFeeForMessage',
  'isBlockhashValid',
  'getRecentPrioritizationFees',
  'getAddressLookupTable',
  'getAssetBatch',
]);

// In-memory rate limiting (per-isolate, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

// Stricter rate limit for admin auth attempts
const adminRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const ADMIN_RATE_LIMIT = 5;
const ADMIN_RATE_WINDOW_MS = 60_000;

// Vanity token tier pricing (single source of truth)
const VANITY_TIERS: Record<string, { tokens: number; lamports: number }> = {
  '1':  { tokens: 1,  lamports: 65_000_000 },
  '3':  { tokens: 3,  lamports: 180_000_000 },
  '5':  { tokens: 5,  lamports: 280_000_000 },
  '10': { tokens: 10, lamports: 500_000_000 },
  '25': { tokens: 25, lamports: 1_100_000_000 },
  '50': { tokens: 50, lamports: 1_950_000_000 },
};

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

function isAdminRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = adminRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    adminRateLimitMap.set(ip, { count: 1, resetAt: now + ADMIN_RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > ADMIN_RATE_LIMIT;
}

// Date helpers
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────
// TOTP (RFC 6238) — pure Web Crypto, no deps
// ──────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(encoded: string): Uint8Array {
  const stripped = encoded.replace(/[\s=]+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor(stripped.length * 5 / 8));

  for (let i = 0; i < stripped.length; i++) {
    const charIndex = BASE32_ALPHABET.indexOf(stripped[i]);
    if (charIndex === -1) continue;
    value = (value << 5) | charIndex;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >> (bits - 8)) & 0xFF;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

function base32Encode(data: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let result = '';

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >> (bits - 5)) & 0x1F];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1F];
  }

  return result;
}

async function generateTOTPCode(secret: Uint8Array, counter: number): Promise<string> {
  // Convert counter to 8-byte big-endian buffer
  const counterBuf = new ArrayBuffer(8);
  const view = new DataView(counterBuf);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);

  const key = await crypto.subtle.importKey(
    'raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  );

  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBuf));

  // Dynamic truncation (RFC 4226 §5.4)
  const offset = hmac[hmac.length - 1] & 0x0F;
  const code = (
    ((hmac[offset] & 0x7F) << 24) |
    ((hmac[offset + 1] & 0xFF) << 16) |
    ((hmac[offset + 2] & 0xFF) << 8) |
    (hmac[offset + 3] & 0xFF)
  ) % 1_000_000;

  return code.toString().padStart(6, '0');
}

async function verifyTOTPCode(secretBase32: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;

  const secretBytes = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 30_000);

  // Allow ±1 window for clock skew
  for (let i = -1; i <= 1; i++) {
    const expected = await generateTOTPCode(secretBytes, counter + i);
    if (expected === code) return true;
  }

  return false;
}

function generateTOTPSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

function buildTOTPUri(secret: string): string {
  return `otpauth://totp/SolReclaimer:admin?secret=${secret}&issuer=SolReclaimer&digits=6&period=30`;
}

// ──────────────────────────────────────────────
// Admin auth helpers
// ──────────────────────────────────────────────

// Timing-safe admin token verification
async function verifyAdmin(request: Request, env: Env): Promise<boolean> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);

  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length === 0) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(token);
  const b = encoder.encode(env.ADMIN_TOKEN);

  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

// KV-based brute-force lockout
async function isAdminBlocked(ip: string, env: Env): Promise<boolean> {
  const raw = await env.STATS.get(`admin:blocked:${ip}`);
  if (!raw) return false;
  const data = JSON.parse(raw) as { count: number };
  return data.count >= 10;
}

async function recordFailedAuth(ip: string, env: Env): Promise<void> {
  const key = `admin:blocked:${ip}`;
  const raw = await env.STATS.get(key);
  const data = raw ? (JSON.parse(raw) as { count: number }) : { count: 0 };
  data.count += 1;
  await env.STATS.put(key, JSON.stringify(data), { expirationTtl: 3600 });
}

async function isTOTPEnabled(env: Env): Promise<boolean> {
  const enabled = await env.STATS.get('admin:totp:enabled');
  return enabled === 'true';
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    origin === 'https://soltools.net' ||
    origin === 'https://www.soltools.net' ||
    origin.startsWith('http://localhost:');

  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://soltools.net',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, solana-client, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status: number, request: Request, env: Env, cacheControl?: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl || 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

// Validate base58 (simple check for Solana addresses)
function isValidBase58(str: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);
}

// ──────────────────────────────────────────────
// RPC Proxy
// ──────────────────────────────────────────────

async function handleRpc(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  // Handle both single and batch requests
  const isBatch = Array.isArray(body);
  const requests = isBatch ? (body as Array<{ method?: string }>) : [body as { method?: string }];

  // Validate all methods
  for (const rpcReq of requests) {
    if (!rpcReq.method || !ALLOWED_METHODS.has(rpcReq.method)) {
      return jsonResponse(
        { error: `Method not allowed: ${rpcReq.method || 'unknown'}` },
        403,
        request,
        env,
      );
    }
  }

  // Forward to Helius
  const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
  const upstream = await fetch(heliusUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await upstream.text();
  return new Response(result, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
    },
  });
}

// ──────────────────────────────────────────────
// Public Stats
// ──────────────────────────────────────────────

async function handleGetStats(request: Request, env: Env): Promise<Response> {
  const raw = await env.STATS.get('stats:global');
  const stats: GlobalStats = raw
    ? JSON.parse(raw)
    : { totalSolReclaimed: 0, totalAccountsClosed: 0, totalWallets: 0 };

  return jsonResponse(stats, 200, request, env);
}

async function handleGetWalletStats(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  if (!wallet || !isValidBase58(wallet)) {
    return jsonResponse({ error: 'Invalid wallet' }, 400, request, env);
  }
  const raw = await env.STATS.get(`wallet:${wallet}`);
  const stats: WalletStats = raw
    ? JSON.parse(raw)
    : { totalSolReclaimed: 0, totalAccountsClosed: 0, uses: 0 };
  return jsonResponse(stats, 200, request, env);
}

async function handleGetVanityWalletStats(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  if (!wallet || !isValidBase58(wallet)) {
    return jsonResponse({ error: 'Invalid wallet' }, 400, request, env);
  }

  // Get buyer stats from the buyers blob
  const rawBuyers = await env.STATS.get('vanity:stats:buyers');
  const buyers = rawBuyers
    ? JSON.parse(rawBuyers) as Record<string, { purchases: number; tokensBought: number; tokensUsed: number; totalSol: number; lastPurchase: number }>
    : {};
  const buyer = buyers[wallet] || { purchases: 0, tokensBought: 0, tokensUsed: 0, totalSol: 0, lastPurchase: 0 };

  // Count current token balance
  let currentBalance = 0;
  let cursor: string | undefined;
  do {
    const result = await env.STATS.list({
      prefix: `vanity:tokens:${wallet}:`,
      ...(cursor ? { cursor } : {}),
    });
    currentBalance += result.keys.length;
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return jsonResponse({
    purchases: buyer.purchases,
    tokensBought: buyer.tokensBought,
    tokensUsed: buyer.tokensUsed,
    totalSol: buyer.totalSol,
    lastPurchase: buyer.lastPurchase,
    currentBalance,
  }, 200, request, env);
}

async function handlePostStats(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  let body: StatsBody;
  try {
    body = await request.json() as StatsBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { solReclaimed, accountsClosed, wallet, signatures } = body;

  if (
    typeof solReclaimed !== 'number' ||
    typeof accountsClosed !== 'number' ||
    typeof wallet !== 'string' ||
    !isValidBase58(wallet) ||
    solReclaimed < 0 ||
    accountsClosed < 0
  ) {
    return jsonResponse({ error: 'Invalid body' }, 400, request, env);
  }

  // Validate signatures if provided
  const sigs: string[] = Array.isArray(signatures)
    ? signatures.filter((s): s is string => typeof s === 'string' && s.length > 0)
    : [];

  const today = todayKey();
  const month = monthKey();

  // Synchronous KV reads
  const [rawGlobal, rawWallet, rawRecent, rawHistory, rawDailyReclaims, rawMonthlyReclaims] = await Promise.all([
    env.STATS.get('stats:global'),
    env.STATS.get(`wallet:${wallet}`),
    env.STATS.get('stats:recent'),
    env.STATS.get('stats:history'),
    env.STATS.get(`analytics:reclaims:daily:${today}`),
    env.STATS.get(`analytics:reclaims:monthly:${month}`),
  ]);

  const global: GlobalStats = rawGlobal
    ? JSON.parse(rawGlobal)
    : { totalSolReclaimed: 0, totalAccountsClosed: 0, totalWallets: 0 };

  const walletStats: WalletStats = rawWallet
    ? JSON.parse(rawWallet)
    : { totalSolReclaimed: 0, totalAccountsClosed: 0, uses: 0 };

  const isNewWallet = walletStats.uses === 0;

  walletStats.totalSolReclaimed += solReclaimed;
  walletStats.totalAccountsClosed += accountsClosed;
  walletStats.uses += 1;

  global.totalSolReclaimed += solReclaimed;
  global.totalAccountsClosed += accountsClosed;
  if (isNewWallet) global.totalWallets += 1;

  // Public recent feed (max 10)
  const recent: RecentReclaim[] = rawRecent ? JSON.parse(rawRecent) : [];
  recent.unshift({
    wallet,
    solReclaimed,
    accountsClosed,
    timestamp: Date.now(),
    signatures: sigs.length > 0 ? sigs : undefined,
  });
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;

  // Detailed history for admin (max 200)
  const history: DetailedReclaim[] = rawHistory ? JSON.parse(rawHistory) : [];
  history.unshift({
    wallet,
    solReclaimed,
    accountsClosed,
    signatures: sigs,
    timestamp: Date.now(),
  });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

  // Daily reclaim aggregates
  const dailyReclaims: DailyReclaims = rawDailyReclaims
    ? JSON.parse(rawDailyReclaims)
    : { count: 0, sol: 0, accounts: 0 };
  dailyReclaims.count += 1;
  dailyReclaims.sol += solReclaimed;
  dailyReclaims.accounts += accountsClosed;

  // Monthly reclaim aggregates
  const monthlyReclaims: DailyReclaims = rawMonthlyReclaims
    ? JSON.parse(rawMonthlyReclaims)
    : { count: 0, sol: 0, accounts: 0 };
  monthlyReclaims.count += 1;
  monthlyReclaims.sol += solReclaimed;
  monthlyReclaims.accounts += accountsClosed;

  await Promise.all([
    env.STATS.put('stats:global', JSON.stringify(global)),
    env.STATS.put(`wallet:${wallet}`, JSON.stringify(walletStats)),
    env.STATS.put('stats:recent', JSON.stringify(recent)),
    env.STATS.put('stats:history', JSON.stringify(history)),
    env.STATS.put(`analytics:reclaims:daily:${today}`, JSON.stringify(dailyReclaims)),
    env.STATS.put(`analytics:reclaims:monthly:${month}`, JSON.stringify(monthlyReclaims)),
  ]);

  return jsonResponse({ ok: true }, 200, request, env);
}

// ──────────────────────────────────────────────
// Analytics (anonymous, public)
// ──────────────────────────────────────────────

async function handleHeartbeat(request: Request, env: Env): Promise<Response> {
  let body: { sessionId?: string };
  try {
    body = await request.json() as { sessionId?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
    return jsonResponse({ error: 'Invalid sessionId' }, 400, request, env);
  }

  await env.STATS.put(`visitor:${sessionId}`, '1', { expirationTtl: 120 });
  return jsonResponse({ ok: true }, 200, request, env);
}

async function handlePageview(request: Request, env: Env): Promise<Response> {
  let body: { page?: string };
  try {
    body = await request.json() as { page?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const page = typeof body.page === 'string' ? body.page.slice(0, 100) : '/';
  const country = request.headers.get('CF-IPCountry') || 'XX';
  const today = todayKey();
  const month = monthKey();

  const [rawDaily, rawMonthly] = await Promise.all([
    env.STATS.get(`analytics:views:daily:${today}`),
    env.STATS.get(`analytics:views:monthly:${month}`),
  ]);

  const daily: DailyViews = rawDaily
    ? JSON.parse(rawDaily)
    : { total: 0, pages: {}, countries: {} };
  daily.total += 1;
  daily.pages[page] = (daily.pages[page] || 0) + 1;
  daily.countries[country] = (daily.countries[country] || 0) + 1;

  const monthly: { total: number } = rawMonthly ? JSON.parse(rawMonthly) : { total: 0 };
  monthly.total += 1;

  await Promise.all([
    env.STATS.put(`analytics:views:daily:${today}`, JSON.stringify(daily)),
    env.STATS.put(`analytics:views:monthly:${month}`, JSON.stringify(monthly)),
  ]);

  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleSocialClick(request: Request, env: Env): Promise<Response> {
  let body: { button?: string };
  try {
    body = await request.json() as { button?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { button } = body;
  if (!button || !ALLOWED_SOCIAL_BUTTONS.has(button)) {
    return jsonResponse({ error: 'Invalid button' }, 400, request, env);
  }

  const key = `analytics:social:${button}`;
  const raw = await env.STATS.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  await env.STATS.put(key, String(count + 1));

  return jsonResponse({ ok: true }, 200, request, env);
}

// ──────────────────────────────────────────────
// Admin endpoints (Bearer token required)
// ──────────────────────────────────────────────

async function handleAdminVerify(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Check KV lockout
  if (await isAdminBlocked(ip, env)) {
    return jsonResponse({ error: 'Too many failed attempts. Try again later.' }, 429, request, env);
  }

  // Check in-memory rate limit
  if (isAdminRateLimited(ip)) {
    return jsonResponse({ error: 'Too many attempts. Slow down.' }, 429, request, env);
  }

  const valid = await verifyAdmin(request, env);
  if (!valid) {
    await recordFailedAuth(ip, env);
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  // Admin key is valid — now check TOTP
  const totpEnabled = await isTOTPEnabled(env);

  if (totpEnabled) {
    // Read TOTP code from body
    let body: { totp?: string } = {};
    try {
      body = await request.json() as { totp?: string };
    } catch {
      // No body is fine — means no TOTP code provided
    }

    if (!body.totp) {
      // Key valid but TOTP required and not provided
      return jsonResponse({ totpRequired: true }, 403, request, env);
    }

    // Verify TOTP code
    const secret = await env.STATS.get('admin:totp:secret');
    if (!secret) {
      return jsonResponse({ error: 'TOTP misconfigured' }, 500, request, env);
    }

    const totpValid = await verifyTOTPCode(secret, body.totp);
    if (!totpValid) {
      await recordFailedAuth(ip, env);
      return jsonResponse({ error: 'Invalid authenticator code' }, 401, request, env);
    }
  }

  return jsonResponse({ ok: true }, 200, request, env);
}

// TOTP setup: generates a new secret and returns it (does NOT enable yet)
async function handleTOTPSetup(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const secret = generateTOTPSecret();
  const uri = buildTOTPUri(secret);

  // Store as pending (not enabled until confirmed)
  await env.STATS.put('admin:totp:pending', secret, { expirationTtl: 600 }); // 10 min to confirm

  // Format secret in groups of 4 for easy reading
  const formatted = secret.match(/.{1,4}/g)?.join(' ') || secret;

  return jsonResponse({ secret: formatted, uri, raw: secret }, 200, request, env);
}

// TOTP confirm: verifies a code against the pending secret, then enables TOTP
async function handleTOTPConfirm(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  let body: { code?: string };
  try {
    body = await request.json() as { code?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  if (!body.code || !/^\d{6}$/.test(body.code)) {
    return jsonResponse({ error: 'Provide a 6-digit code' }, 400, request, env);
  }

  const pendingSecret = await env.STATS.get('admin:totp:pending');
  if (!pendingSecret) {
    return jsonResponse({ error: 'No pending TOTP setup. Start setup first.' }, 400, request, env);
  }

  const valid = await verifyTOTPCode(pendingSecret, body.code);
  if (!valid) {
    return jsonResponse({ error: 'Invalid code. Check your authenticator app and try again.' }, 400, request, env);
  }

  // Enable TOTP
  await Promise.all([
    env.STATS.put('admin:totp:secret', pendingSecret),
    env.STATS.put('admin:totp:enabled', 'true'),
    env.STATS.delete('admin:totp:pending'),
  ]);

  return jsonResponse({ ok: true, message: 'TOTP enabled successfully' }, 200, request, env);
}

// TOTP disable: requires valid TOTP code to disable
async function handleTOTPDisable(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  let body: { code?: string };
  try {
    body = await request.json() as { code?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  if (!body.code || !/^\d{6}$/.test(body.code)) {
    return jsonResponse({ error: 'Provide your current 6-digit code to disable TOTP' }, 400, request, env);
  }

  const secret = await env.STATS.get('admin:totp:secret');
  if (!secret) {
    return jsonResponse({ error: 'TOTP is not enabled' }, 400, request, env);
  }

  const valid = await verifyTOTPCode(secret, body.code);
  if (!valid) {
    return jsonResponse({ error: 'Invalid code' }, 401, request, env);
  }

  await Promise.all([
    env.STATS.delete('admin:totp:secret'),
    env.STATS.delete('admin:totp:enabled'),
  ]);

  return jsonResponse({ ok: true, message: 'TOTP disabled' }, 200, request, env);
}

// TOTP status: check if TOTP is enabled (requires admin auth)
async function handleTOTPStatus(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const enabled = await isTOTPEnabled(env);
  return jsonResponse({ enabled }, 200, request, env);
}

async function handleAdminDashboard(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const today = todayKey();
  const month = monthKey();

  // Build keys for the last 7 days
  const weekDayKeys = Array.from({ length: 7 }, (_, i) => `analytics:reclaims:daily:${daysAgoKey(i)}`);

  // Fetch all data in parallel
  const [
    rawGlobal,
    rawTodayViews,
    rawTodayReclaims,
    rawMonthReclaims,
    rawHistory,
    rawSocialGithub,
    rawSocialX,
    rawSocialShareX,
    rawSocialBuiltBy,
    rawSocialShareBurn,
    rawActiveVisitors,
    ...rawWeekDays
  ] = await Promise.all([
    env.STATS.get('stats:global'),
    env.STATS.get(`analytics:views:daily:${today}`),
    env.STATS.get(`analytics:reclaims:daily:${today}`),
    env.STATS.get(`analytics:reclaims:monthly:${month}`),
    env.STATS.get('stats:history'),
    env.STATS.get('analytics:social:github'),
    env.STATS.get('analytics:social:x'),
    env.STATS.get('analytics:social:share-x'),
    env.STATS.get('analytics:social:built-by'),
    env.STATS.get('analytics:social:share-burn'),
    env.STATS.get('stats:activeVisitors'),
    ...weekDayKeys.map(k => env.STATS.get(k)),
  ]);

  const globalStats: GlobalStats = rawGlobal
    ? JSON.parse(rawGlobal)
    : { totalSolReclaimed: 0, totalAccountsClosed: 0, totalWallets: 0 };

  const todayViews: DailyViews = rawTodayViews
    ? JSON.parse(rawTodayViews)
    : { total: 0, pages: {}, countries: {} };

  const todayReclaims: DailyReclaims = rawTodayReclaims
    ? JSON.parse(rawTodayReclaims)
    : { count: 0, sol: 0, accounts: 0 };

  const monthReclaims: DailyReclaims = rawMonthReclaims
    ? JSON.parse(rawMonthReclaims)
    : { count: 0, sol: 0, accounts: 0 };

  // Aggregate weekly reclaims from daily keys
  const weekReclaims: DailyReclaims = { count: 0, sol: 0, accounts: 0 };
  for (const raw of rawWeekDays) {
    if (raw) {
      const day: DailyReclaims = JSON.parse(raw as string);
      weekReclaims.count += day.count;
      weekReclaims.sol += day.sol;
      weekReclaims.accounts += day.accounts;
    }
  }

  const history: DetailedReclaim[] = rawHistory ? JSON.parse(rawHistory) : [];

  const socialClicks: Record<string, number> = {
    github: rawSocialGithub ? parseInt(rawSocialGithub, 10) : 0,
    x: rawSocialX ? parseInt(rawSocialX, 10) : 0,
    'share-x': rawSocialShareX ? parseInt(rawSocialShareX, 10) : 0,
    'share-burn': rawSocialShareBurn ? parseInt(rawSocialShareBurn, 10) : 0,
    'built-by': rawSocialBuiltBy ? parseInt(rawSocialBuiltBy, 10) : 0,
  };

  const data: AdminDashboardData = {
    activeVisitors: rawActiveVisitors ? parseInt(rawActiveVisitors, 10) : 0,
    globalStats,
    todayViews,
    todayReclaims,
    weekReclaims,
    monthReclaims,
    socialClicks,
    recentReclaims: history.slice(0, 50),
  };

  return jsonResponse(data, 200, request, env);
}

async function handleAdminReclaims(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));

  const rawHistory = await env.STATS.get('stats:history');
  const history: DetailedReclaim[] = rawHistory ? JSON.parse(rawHistory) : [];

  const start = (page - 1) * limit;
  const end = start + limit;
  const items = history.slice(start, end);

  return jsonResponse({
    items,
    total: history.length,
    page,
    limit,
    totalPages: Math.ceil(history.length / limit),
  }, 200, request, env);
}

async function handleAdminVisitors(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const raw = await env.STATS.get('stats:activeVisitors');
  const activeVisitors = raw ? parseInt(raw, 10) : 0;

  return jsonResponse({ activeVisitors }, 200, request, env);
}

async function handleAdminChart(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const url = new URL(request.url);

  // Accept start/end ISO date strings, or fall back to days param
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  let dayKeys: string[] = [];

  if (startParam && endParam) {
    // Generate all dates between start and end (inclusive)
    const start = new Date(startParam + 'T00:00:00Z');
    const end = new Date(endParam + 'T00:00:00Z');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return jsonResponse({ error: 'Invalid date format' }, 400, request, env);
    }
    // Cap at 90 days max
    const maxEnd = new Date(start.getTime() + 90 * 86400000);
    const clampedEnd = end > maxEnd ? maxEnd : end;
    const cursor = new Date(start);
    while (cursor <= clampedEnd) {
      dayKeys.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
    for (let i = days - 1; i >= 0; i--) {
      dayKeys.push(daysAgoKey(i));
    }
  }

  const [reclaimResults, viewResults] = await Promise.all([
    Promise.all(dayKeys.map(d => env.STATS.get(`analytics:reclaims:daily:${d}`))),
    Promise.all(dayKeys.map(d => env.STATS.get(`analytics:views:daily:${d}`))),
  ]);

  const points = dayKeys.map((date, i) => {
    const reclaims: DailyReclaims = reclaimResults[i]
      ? JSON.parse(reclaimResults[i] as string)
      : { count: 0, sol: 0, accounts: 0 };
    const views: DailyViews = viewResults[i]
      ? JSON.parse(viewResults[i] as string)
      : { total: 0, pages: {}, countries: {} };

    return {
      date,
      reclaims: reclaims.count,
      sol: reclaims.sol,
      accounts: reclaims.accounts,
      views: views.total,
    };
  });

  // Already oldest-first when using start/end; ensure same for days param
  return jsonResponse(points, 200, request, env);
}

// ──────────────────────────────────────────────
// Price proxy (CoinGecko blocks browser CORS)
// ──────────────────────────────────────────────

let cachedPrices: { data: string; fetchedAt: number } | null = null;
const PRICE_CACHE_MS = 30_000;

// ──────────────────────────────────────────────
// Hackathon Screener
// ──────────────────────────────────────────────

const HACKATHON_INITIAL_TOKENS = [
  '6CRayr4GnspC1GUDLs693oPk7AoDSXLXSx9kskgupump',
  '2PzS5SYYWjUFvzXNFaMmRkpjkxGX6R5v8DnKYtdcpump',
  '2FQK7ZE2DpWy4e3BLpJas5VtBozsWgsoDRLeA8mvpump',
  'FyPDfX92B4uEk4zZouy96d1Kk1LgnCznBpzAFSsZpump',
  'B1rGc4HM4Q6q4nU78ADM7fGguxqiasH53fh6ViDXpump',
  'DNhQZ1CE9qZ2FNrVhsCXwQJ2vZG8ufZkcYakTS5Jpump',
  '2LzLh5pHg3nDQz6goTLAvDXfDbSBgAR8qem3bdXdpump',
  'CASHiSiReNKnoKghZqzASoPe8RiH2D3ntr52WfLhon8A',
  '84nGjHwSScH1wVHzQWgK6EzNmTX9FwPNdY3BQBZjpump',
  'H5b4iYiZYycr7fmQ1dMj7hdfLGAEPcDH261K4hugpump',
  '8SePknMizxUWZFnyHcNLXy6wiqEWUKG1kgV9Z6N7BS6a',
  'DK9nBUMfdu4XprPRWeh8f6KnQiGWD8Z4xz3yzs9gpump',
  '5wVtfsFhLjxm27K9mN3ziYWCCpQwXXq7HWUiRMW7pump',
  '7EW5dDD6MYJK4PcZ89MGApJQwWeDEeNgH4NCVU4qpump',
  '4AjvPXMn8YZG9saAVJvcWspg73oTFf2JmU4in4Xgpump',
  'GmWjhA47wkPRSji6zR3RLLR9HohZFfi7ukXpSAiupump',
  'GnM6XZ7DN9KSPW2ZVMNqCggsxjnxHMGb2t4kiWrUpump',
  'Gd4qRUCe3J871r5uVuxv8aUUnDbeT27TGaFjWVnhpump',
  'Eg2ymQ2aQqjMcibnmTt8erC6Tvk9PVpJZCxvVPJz2agu',
  '7YBdmuEwgMjd7Ca5mGkHMPNofVseeGQqepYfAvSLpump',
  'C1i5iXBaW3tG9RZtSR5o1emW1jzuiMikQNb2NiNGpump',
  '8ncucXv6U6epZKHPbgaEBcEK399TpHGKCquSt4RnmX4f',
  'BygYYihmnVcmmAM6xfnaKPoApiaTaHAt3diEhS5upump',
  'DLGRpmkMGr7J4KD1xR5x2XjaGeQH64PLFQkyxNNSpump',
  'DU7BqqKt7vC9i7paUQSeduxkWkTHQmoVR85M79pfpump',
  'BbbwE8rudhjK4husSRc37X54mYyDBRcykJ7fk5oHpump',
  '5GTRGGnmbMCjCUnc3xMweCgVqDEtSDxTdvVdwutcpump',
  'ZdBMPxmwBrHvMKY4d4KbDjycDEhfeiaFfHjF13epump',
  '9WXoRk3hGUQD5ymKwFei1CR9Pa5aU6tti6YuL1Snpump',
  '2hXQn7nJbh2XFTxvtyKb5mKfnScuoiC1Sm8rnWydpump',
  'UVcu7kbVKW6Rs5PKzuwVSbm8ukvrWByS3hBXqHapump',
  'FTBq3w9gCv27E451DV6w8AbUjBQbyVxxj1ZaYEYepump',
  'BLXbbr3QNHntRQrQmvbkNKghJiwt2jfT5U3jT5FCpump',
  'axUxN2q4AWzHaU6LXmjqQh7KEjaXDPKScjmzwEBpump',
  'DtgCVZ877swr93rHXhbfshcthnSK2Ds4dz3XC8GYpump',
  '48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump',
  'FNhcY1cwQvQqaM8CUjXSuoGKJniwC4maBRLqNRLipump',
  'AoQGnPGXWHo9FfSVhPTmhJGvGXisEDwfaRPnDHHRpump',
  'AoKgjNMumZ2JjHFaGnrcKSnuTTRqrHWdKHhPMhzjpump',
  '4ZFHpmXteZs9cGao87L3qkJzRBxeziesgphhpLvLpump',
  'DRtvTCzfiKGhCVREmBbZdN9sB8PHeq9KdRZ3VmFhpump',
  '3E7LWnvBjKiauBJfbSFe86A1i5Rnzzs853bbjTmApump',
  '5heFpjbEpD7shwBNVGHVnjzjRES4zwLj2qJG8MS9pump',
  '5EyGMW1wNxMj7YtVP54uBH6ktwpTNCvX9DDEnmcsHdev',
  '668M7bUFkv1phLS7eguSfYGBjPxLi3P9UAsEDSP8pump',
];

interface HackathonTokenData {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  pairUrl: string;
  pumpFunUrl: string;
  twitterUrl: string | null;
  websiteUrl: string | null;
  telegramUrl: string | null;
}

interface DexScreenerPair {
  baseToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  priceChange: { h24: number };
  marketCap: number;
  volume: { h24: number };
  liquidity: { usd: number };
  url: string;
  info?: {
    imageUrl?: string;
    socials?: Array<{ type: string; url: string }>;
    websites?: Array<{ url: string }>;
  };
}

let cachedHackathonData: { tokens: HackathonTokenData[]; fetchedAt: number } | null = null;
const HACKATHON_CACHE_MS = 120_000;

async function handleHackathonTokens(request: Request, env: Env): Promise<Response> {
  const now = Date.now();

  // Return in-memory cache if fresh
  if (cachedHackathonData && now - cachedHackathonData.fetchedAt < HACKATHON_CACHE_MS) {
    return jsonResponse({ tokens: cachedHackathonData.tokens, lastUpdated: cachedHackathonData.fetchedAt }, 200, request, env);
  }

  // Get approved token list from KV or fall back to hardcoded
  const rawApproved = await env.STATS.get('hackathon:tokens');
  const mints: string[] = rawApproved ? JSON.parse(rawApproved) : HACKATHON_INITIAL_TOKENS;

  try {
    // DexScreener limits to 30 addresses per request — chunk mints
    const CHUNK_SIZE = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < mints.length; i += CHUNK_SIZE) {
      chunks.push(mints.slice(i, i + CHUNK_SIZE));
    }

    const chunkResults = await Promise.allSettled(
      chunks.map(chunk =>
        fetch(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`)
          .then(r => r.ok ? r.json() as Promise<{ pairs: DexScreenerPair[] | null }> : null)
      )
    );

    // Group by base token address, pick highest liquidity pair per token
    const bestPairs = new Map<string, DexScreenerPair>();
    for (const result of chunkResults) {
      if (result.status === 'fulfilled' && result.value) {
        for (const pair of result.value.pairs || []) {
          const addr = pair.baseToken.address;
          const existing = bestPairs.get(addr);
          if (!existing || (pair.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
            bestPairs.set(addr, pair);
          }
        }
      }
    }

    // Followup for any tokens still missing (DexScreener 30-pair cap per chunk)
    const missingMints = mints.filter(m => !bestPairs.has(m));
    if (missingMints.length > 0) {
      const followups = await Promise.allSettled(
        missingMints.map(mint =>
          fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
            .then(r => r.ok ? r.json() as Promise<{ pairs: DexScreenerPair[] | null }> : null)
        )
      );
      for (const result of followups) {
        if (result.status === 'fulfilled' && result.value) {
          for (const pair of result.value.pairs || []) {
            const addr = pair.baseToken.address;
            const existing = bestPairs.get(addr);
            if (!existing || (pair.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
              bestPairs.set(addr, pair);
            }
          }
        }
      }
    }

    const tokens: HackathonTokenData[] = mints.map(mint => {
      const pair = bestPairs.get(mint);
      if (!pair) {
        return {
          address: mint,
          name: mint.slice(0, 6) + '...',
          symbol: '???',
          imageUrl: null,
          priceUsd: 0,
          priceChange24h: 0,
          marketCap: 0,
          volume24h: 0,
          liquidity: 0,
          pairUrl: '',
          pumpFunUrl: `https://pump.fun/coin/${mint}`,
          twitterUrl: null,
          websiteUrl: null,
          telegramUrl: null,
        };
      }

      const socials = pair.info?.socials || [];
      const twitterSocial = socials.find(s => s.type === 'twitter');
      const telegramSocial = socials.find(s => s.type === 'telegram');
      const websites = pair.info?.websites || [];

      return {
        address: mint,
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol,
        imageUrl: pair.info?.imageUrl || null,
        priceUsd: parseFloat(pair.priceUsd) || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        marketCap: pair.marketCap || 0,
        volume24h: pair.volume?.h24 || 0,
        liquidity: pair.liquidity?.usd || 0,
        pairUrl: pair.url || '',
        pumpFunUrl: `https://pump.fun/coin/${mint}`,
        twitterUrl: twitterSocial?.url || null,
        websiteUrl: websites[0]?.url || null,
        telegramUrl: telegramSocial?.url || null,
      };
    });

    cachedHackathonData = { tokens, fetchedAt: now };

    // Persist to KV for cold start fallback (fire and forget)
    env.STATS.put('hackathon:cache', JSON.stringify(cachedHackathonData)).catch(() => {});

    return jsonResponse({ tokens, lastUpdated: now }, 200, request, env);
  } catch {
    // Try KV cache fallback
    const rawCache = await env.STATS.get('hackathon:cache');
    if (rawCache) {
      const cached = JSON.parse(rawCache) as { tokens: HackathonTokenData[]; fetchedAt: number };
      cachedHackathonData = cached;
      return jsonResponse({ tokens: cached.tokens, lastUpdated: cached.fetchedAt }, 200, request, env);
    }

    return jsonResponse({ tokens: [], error: 'temporarily unavailable' }, 503, request, env);
  }
}

interface HackathonSubmission {
  mint: string;
  projectName: string;
  relationship: 'creator' | 'finder';
  twitter: string | null;
  website: string | null;
  description: string | null;
  submittedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

async function handleHackathonSubmit(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  let body: { mintAddress?: string; projectName?: string; relationship?: string; twitter?: string; website?: string; description?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { mintAddress, projectName, relationship, twitter, website, description } = body;

  if (!mintAddress || !isValidBase58(mintAddress)) {
    return jsonResponse({ error: 'Invalid mint address' }, 400, request, env);
  }

  if (!projectName || projectName.length < 3 || projectName.length > 50) {
    return jsonResponse({ error: 'Project name must be 3-50 characters' }, 400, request, env);
  }

  // Check duplicate
  const existing = await env.STATS.get(`hackathon:submission:${mintAddress}`);
  if (existing) {
    return jsonResponse({ error: 'Token already submitted' }, 409, request, env);
  }

  const rel = relationship === 'finder' ? 'finder' : 'creator';

  const submission: HackathonSubmission = {
    mint: mintAddress,
    projectName,
    relationship: rel,
    twitter: typeof twitter === 'string' ? twitter.slice(0, 100) : null,
    website: typeof website === 'string' ? website.slice(0, 200) : null,
    description: typeof description === 'string' ? description.slice(0, 200) : null,
    submittedAt: Date.now(),
    status: 'pending',
  };

  // Store submission + append to list
  const rawList = await env.STATS.get('hackathon:submissions:list');
  const list: string[] = rawList ? JSON.parse(rawList) : [];
  list.push(mintAddress);

  await Promise.all([
    env.STATS.put(`hackathon:submission:${mintAddress}`, JSON.stringify(submission)),
    env.STATS.put('hackathon:submissions:list', JSON.stringify(list)),
  ]);

  return jsonResponse({ ok: true }, 200, request, env);
}

// ──────────────────────────────────────────────
// Admin Hackathon Submission Management
// ──────────────────────────────────────────────

async function handleAdminHackathonSubmissions(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const rawList = await env.STATS.get('hackathon:submissions:list');
  const mints: string[] = rawList ? JSON.parse(rawList) : [];

  if (mints.length === 0) {
    return jsonResponse({ submissions: [] }, 200, request, env);
  }

  const submissions: HackathonSubmission[] = [];
  // Fetch all submissions in parallel
  const results = await Promise.all(
    mints.map(mint => env.STATS.get(`hackathon:submission:${mint}`))
  );

  for (const raw of results) {
    if (raw) {
      submissions.push(JSON.parse(raw) as HackathonSubmission);
    }
  }

  // Sort newest first
  submissions.sort((a, b) => b.submittedAt - a.submittedAt);

  return jsonResponse({ submissions }, 200, request, env);
}

async function handleAdminHackathonApprove(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  let body: { mint?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { mint } = body;
  if (!mint || !isValidBase58(mint)) {
    return jsonResponse({ error: 'Invalid mint address' }, 400, request, env);
  }

  // Update submission status
  const rawSubmission = await env.STATS.get(`hackathon:submission:${mint}`);
  if (!rawSubmission) {
    return jsonResponse({ error: 'Submission not found' }, 404, request, env);
  }

  const submission = JSON.parse(rawSubmission) as HackathonSubmission;
  submission.status = 'approved';

  // Read current approved tokens list
  const rawTokens = await env.STATS.get('hackathon:tokens');
  const tokens: string[] = rawTokens ? JSON.parse(rawTokens) : [...HACKATHON_INITIAL_TOKENS];

  // Append if not already present
  if (!tokens.includes(mint)) {
    tokens.push(mint);
  }

  await Promise.all([
    env.STATS.put(`hackathon:submission:${mint}`, JSON.stringify(submission)),
    env.STATS.put('hackathon:tokens', JSON.stringify(tokens)),
    env.STATS.delete('hackathon:cache'),
  ]);

  // Clear in-memory cache to force refresh
  cachedHackathonData = null;

  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleAdminHackathonReject(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  let body: { mint?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { mint } = body;
  if (!mint || !isValidBase58(mint)) {
    return jsonResponse({ error: 'Invalid mint address' }, 400, request, env);
  }

  const rawSubmission = await env.STATS.get(`hackathon:submission:${mint}`);
  if (!rawSubmission) {
    return jsonResponse({ error: 'Submission not found' }, 404, request, env);
  }

  const submission = JSON.parse(rawSubmission) as HackathonSubmission;
  submission.status = 'rejected';

  await env.STATS.put(`hackathon:submission:${mint}`, JSON.stringify(submission));

  return jsonResponse({ ok: true }, 200, request, env);
}

// Pyth price feed IDs
const PYTH_SOL_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
const PYTH_BTC_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';

interface PythResponse {
  parsed: Array<{
    id: string;
    price: { price: string; expo: number };
  }>;
}

async function handlePrices(request: Request, env: Env): Promise<Response> {
  const now = Date.now();

  if (cachedPrices && now - cachedPrices.fetchedAt < PRICE_CACHE_MS) {
    return new Response(cachedPrices.data, {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
    });
  }

  try {
    const res = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_SOL_ID}&ids[]=${PYTH_BTC_ID}`,
    );

    if (!res.ok) throw new Error('Pyth fetch failed');

    const pyth = await res.json() as PythResponse;

    let solPrice = 0;
    let btcPrice = 0;

    for (const entry of pyth.parsed) {
      const usd = parseFloat(entry.price.price) * Math.pow(10, entry.price.expo);
      if (entry.id === PYTH_SOL_ID.slice(2)) solPrice = usd;
      if (entry.id === PYTH_BTC_ID.slice(2)) btcPrice = usd;
    }

    const data = JSON.stringify({
      solana: { usd: solPrice },
      bitcoin: { usd: btcPrice },
    });

    cachedPrices = { data, fetchedAt: now };

    return new Response(data, {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
    });
  } catch {
    if (cachedPrices) {
      return new Response(cachedPrices.data, {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
      });
    }
    return jsonResponse({ error: 'Failed to fetch prices' }, 502, request, env);
  }
}

// ──────────────────────────────────────────────
// Vanity Token System
// ──────────────────────────────────────────────

async function handleVanityBalance(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');

  if (!wallet || !isValidBase58(wallet)) {
    return jsonResponse({ error: 'Invalid wallet' }, 400, request, env);
  }

  let balance = 0;
  let cursor: string | undefined;

  do {
    const result = await env.STATS.list({
      prefix: `vanity:tokens:${wallet}:`,
      ...(cursor ? { cursor } : {}),
    });
    balance += result.keys.length;
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return jsonResponse({ balance }, 200, request, env);
}

async function handleVanityPurchase(request: Request, env: Env): Promise<Response> {
  let body: { wallet?: string; signature?: string; tier?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { wallet, signature, tier } = body;

  if (!wallet || !isValidBase58(wallet)) {
    return jsonResponse({ error: 'Invalid wallet' }, 400, request, env);
  }
  if (!signature || typeof signature !== 'string' || signature.length < 80 || signature.length > 100) {
    return jsonResponse({ error: 'Invalid signature' }, 400, request, env);
  }
  if (!tier || !(tier in VANITY_TIERS)) {
    return jsonResponse({ error: 'Invalid tier' }, 400, request, env);
  }

  if (!env.TREASURY_ADDRESS) {
    return jsonResponse({ error: 'Service unavailable' }, 503, request, env);
  }

  // Prevent double-credit replay
  const sigKey = `purchase:sig:${signature}`;
  const existing = await env.STATS.get(sigKey);
  if (existing) {
    return jsonResponse({ error: 'Signature already credited' }, 409, request, env);
  }

  // Fetch and verify transaction on-chain (retry up to 5 times with 3s delay for propagation)
  const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;

  type RpcTxResult = {
    result?: {
      meta?: { err: unknown };
      transaction?: {
        message?: {
          accountKeys?: Array<{ pubkey: string; signer: boolean }>;
          instructions?: Array<{
            program?: string;
            programId?: string;
            parsed?: {
              type?: string;
              info?: { source?: string; destination?: string; lamports?: number };
            };
          }>;
        };
      };
    };
  };

  let rpcData: RpcTxResult | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 3000));
    }

    const rpcRes = await fetch(heliusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }],
      }),
    });

    const data = await rpcRes.json() as RpcTxResult;
    if (data.result) {
      rpcData = data;
      break;
    }
  }

  if (!rpcData?.result) {
    return jsonResponse({ error: 'Transaction not found after retries. It may still be confirming — please try again in a minute.' }, 404, request, env);
  }

  const tx = rpcData.result;

  // Verify no error
  if (tx.meta?.err) {
    return jsonResponse({ error: 'Transaction failed on-chain' }, 400, request, env);
  }

  const message = tx.transaction?.message;
  if (!message) {
    return jsonResponse({ error: 'Invalid transaction structure' }, 400, request, env);
  }

  // Verify wallet is a signer
  const accountKeys = message.accountKeys || [];
  const isSigner = accountKeys.some(k => k.pubkey === wallet && k.signer);
  if (!isSigner) {
    return jsonResponse({ error: 'Wallet is not a signer on this transaction' }, 400, request, env);
  }

  // Verify SystemProgram.transfer with correct source, destination, lamports
  const tierData = VANITY_TIERS[tier];
  const instructions = message.instructions || [];
  const hasValidTransfer = instructions.some(ix => {
    if (ix.program !== 'system' && ix.programId !== '11111111111111111111111111111111') return false;
    const parsed = ix.parsed;
    if (!parsed || parsed.type !== 'transfer') return false;
    const info = parsed.info;
    if (!info) return false;
    return (
      info.source === wallet &&
      info.destination === env.TREASURY_ADDRESS &&
      info.lamports === tierData.lamports
    );
  });

  if (!hasValidTransfer) {
    return jsonResponse({ error: 'No matching transfer found in transaction' }, 400, request, env);
  }

  // Generate token IDs and store them
  const tokenIds: string[] = [];
  for (let i = 0; i < tierData.tokens; i++) {
    tokenIds.push(crypto.randomUUID());
  }

  const solAmount = tierData.lamports / 1_000_000_000;
  const today = todayKey();
  const month = monthKey();

  // Read aggregate stats in parallel
  const [rawVGlobal, rawVDaily, rawVMonthly, rawVTiers, rawVBuyers, rawVHistory] = await Promise.all([
    env.STATS.get('vanity:stats:global'),
    env.STATS.get(`vanity:stats:daily:${today}`),
    env.STATS.get(`vanity:stats:monthly:${month}`),
    env.STATS.get('vanity:stats:tiers'),
    env.STATS.get('vanity:stats:buyers'),
    env.STATS.get('vanity:history'),
  ]);

  const vGlobal = rawVGlobal
    ? JSON.parse(rawVGlobal) as { totalTokensSold: number; totalRevenueSol: number; totalTokensUsed: number; uniqueBuyers: number }
    : { totalTokensSold: 0, totalRevenueSol: 0, totalTokensUsed: 0, uniqueBuyers: 0 };
  vGlobal.totalTokensSold += tierData.tokens;
  vGlobal.totalRevenueSol += solAmount;

  const vDaily = rawVDaily
    ? JSON.parse(rawVDaily) as { purchases: number; tokensSold: number; revenueSol: number; tokensUsed: number }
    : { purchases: 0, tokensSold: 0, revenueSol: 0, tokensUsed: 0 };
  vDaily.purchases += 1;
  vDaily.tokensSold += tierData.tokens;
  vDaily.revenueSol += solAmount;

  const vMonthly = rawVMonthly
    ? JSON.parse(rawVMonthly) as { purchases: number; tokensSold: number; revenueSol: number; tokensUsed: number }
    : { purchases: 0, tokensSold: 0, revenueSol: 0, tokensUsed: 0 };
  vMonthly.purchases += 1;
  vMonthly.tokensSold += tierData.tokens;
  vMonthly.revenueSol += solAmount;

  const vTiers = rawVTiers
    ? JSON.parse(rawVTiers) as Record<string, { count: number; tokens: number; sol: number }>
    : {} as Record<string, { count: number; tokens: number; sol: number }>;
  if (!vTiers[tier]) vTiers[tier] = { count: 0, tokens: 0, sol: 0 };
  vTiers[tier].count += 1;
  vTiers[tier].tokens += tierData.tokens;
  vTiers[tier].sol += solAmount;

  const vBuyers = rawVBuyers
    ? JSON.parse(rawVBuyers) as Record<string, { purchases: number; tokensBought: number; tokensUsed: number; totalSol: number; lastPurchase: number }>
    : {} as Record<string, { purchases: number; tokensBought: number; tokensUsed: number; totalSol: number; lastPurchase: number }>;
  const isNewBuyer = !vBuyers[wallet];
  if (!vBuyers[wallet]) vBuyers[wallet] = { purchases: 0, tokensBought: 0, tokensUsed: 0, totalSol: 0, lastPurchase: 0 };
  vBuyers[wallet].purchases += 1;
  vBuyers[wallet].tokensBought += tierData.tokens;
  vBuyers[wallet].totalSol += solAmount;
  vBuyers[wallet].lastPurchase = Date.now();
  if (isNewBuyer) vGlobal.uniqueBuyers += 1;

  const vHistory = rawVHistory
    ? JSON.parse(rawVHistory) as Array<{ wallet: string; tier: string; tokens: number; sol: number; signature: string; timestamp: number }>
    : [] as Array<{ wallet: string; tier: string; tokens: number; sol: number; signature: string; timestamp: number }>;
  vHistory.unshift({ wallet, tier, tokens: tierData.tokens, sol: solAmount, signature, timestamp: Date.now() });
  if (vHistory.length > MAX_HISTORY) vHistory.length = MAX_HISTORY;

  await Promise.all([
    ...tokenIds.map(id =>
      env.STATS.put(`vanity:tokens:${wallet}:${id}`, '1')
    ),
    env.STATS.put(sigKey, '1', { expirationTtl: 7_776_000 }), // 90 days
    env.STATS.put(`purchase:log:${wallet}:${Date.now()}`, JSON.stringify({
      tier,
      tokens: tierData.tokens,
      sol: solAmount,
      signature,
    })),
    env.STATS.put('vanity:stats:global', JSON.stringify(vGlobal)),
    env.STATS.put(`vanity:stats:daily:${today}`, JSON.stringify(vDaily)),
    env.STATS.put(`vanity:stats:monthly:${month}`, JSON.stringify(vMonthly)),
    env.STATS.put('vanity:stats:tiers', JSON.stringify(vTiers)),
    env.STATS.put('vanity:stats:buyers', JSON.stringify(vBuyers)),
    env.STATS.put('vanity:history', JSON.stringify(vHistory)),
  ]);

  // Count total balance
  let balance = 0;
  let cursor: string | undefined;
  do {
    const result = await env.STATS.list({
      prefix: `vanity:tokens:${wallet}:`,
      ...(cursor ? { cursor } : {}),
    });
    balance += result.keys.length;
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return jsonResponse({ ok: true, balance, credited: tierData.tokens }, 200, request, env);
}

async function handleVanityDeduct(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  let body: { wallet?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { wallet } = body;

  if (!wallet || !isValidBase58(wallet)) {
    return jsonResponse({ error: 'Invalid wallet' }, 400, request, env);
  }

  // List one token key
  const result = await env.STATS.list({
    prefix: `vanity:tokens:${wallet}:`,
    limit: 1,
  });

  if (result.keys.length === 0) {
    return jsonResponse({ ok: false, error: 'Insufficient tokens' }, 403, request, env);
  }

  // Delete the token immediately
  await env.STATS.delete(result.keys[0].name);

  // Update vanity usage stats
  const today = todayKey();
  const month = monthKey();
  const [rawVGlobal, rawVDaily, rawVMonthly, rawVBuyers] = await Promise.all([
    env.STATS.get('vanity:stats:global'),
    env.STATS.get(`vanity:stats:daily:${today}`),
    env.STATS.get(`vanity:stats:monthly:${month}`),
    env.STATS.get('vanity:stats:buyers'),
  ]);

  const vGlobal = rawVGlobal
    ? JSON.parse(rawVGlobal) as { totalTokensSold: number; totalRevenueSol: number; totalTokensUsed: number; uniqueBuyers: number }
    : { totalTokensSold: 0, totalRevenueSol: 0, totalTokensUsed: 0, uniqueBuyers: 0 };
  vGlobal.totalTokensUsed += 1;

  const vDaily = rawVDaily
    ? JSON.parse(rawVDaily) as { purchases: number; tokensSold: number; revenueSol: number; tokensUsed: number }
    : { purchases: 0, tokensSold: 0, revenueSol: 0, tokensUsed: 0 };
  vDaily.tokensUsed += 1;

  const vMonthly = rawVMonthly
    ? JSON.parse(rawVMonthly) as { purchases: number; tokensSold: number; revenueSol: number; tokensUsed: number }
    : { purchases: 0, tokensSold: 0, revenueSol: 0, tokensUsed: 0 };
  vMonthly.tokensUsed += 1;

  const vBuyers = rawVBuyers
    ? JSON.parse(rawVBuyers) as Record<string, { purchases: number; tokensBought: number; tokensUsed: number; totalSol: number; lastPurchase: number }>
    : {} as Record<string, { purchases: number; tokensBought: number; tokensUsed: number; totalSol: number; lastPurchase: number }>;
  if (vBuyers[wallet]) vBuyers[wallet].tokensUsed += 1;

  await Promise.all([
    env.STATS.put('vanity:stats:global', JSON.stringify(vGlobal)),
    env.STATS.put(`vanity:stats:daily:${today}`, JSON.stringify(vDaily)),
    env.STATS.put(`vanity:stats:monthly:${month}`, JSON.stringify(vMonthly)),
    env.STATS.put('vanity:stats:buyers', JSON.stringify(vBuyers)),
  ]);

  // Count remaining balance
  let remaining = 0;
  let cursor: string | undefined;
  do {
    const listResult = await env.STATS.list({
      prefix: `vanity:tokens:${wallet}:`,
      ...(cursor ? { cursor } : {}),
    });
    remaining += listResult.keys.length;
    cursor = listResult.list_complete ? undefined : listResult.cursor;
  } while (cursor);

  return jsonResponse({ ok: true, remaining }, 200, request, env);
}

// ──────────────────────────────────────────────
// Admin Vanity Endpoints
// ──────────────────────────────────────────────

async function handleAdminVanityDashboard(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const today = todayKey();
  const month = monthKey();

  const [rawGlobal, rawToday, rawMonth, rawTiers, rawBuyers] = await Promise.all([
    env.STATS.get('vanity:stats:global'),
    env.STATS.get(`vanity:stats:daily:${today}`),
    env.STATS.get(`vanity:stats:monthly:${month}`),
    env.STATS.get('vanity:stats:tiers'),
    env.STATS.get('vanity:stats:buyers'),
  ]);

  const global = rawGlobal
    ? JSON.parse(rawGlobal)
    : { totalTokensSold: 0, totalRevenueSol: 0, totalTokensUsed: 0, uniqueBuyers: 0 };

  const todayStats = rawToday
    ? JSON.parse(rawToday)
    : { purchases: 0, tokensSold: 0, revenueSol: 0, tokensUsed: 0 };

  const monthStats = rawMonth
    ? JSON.parse(rawMonth)
    : { purchases: 0, tokensSold: 0, revenueSol: 0, tokensUsed: 0 };

  const tiers = rawTiers ? JSON.parse(rawTiers) : {};
  const buyers = rawBuyers
    ? JSON.parse(rawBuyers) as Record<string, { purchases: number; tokensBought: number; tokensUsed: number; totalSol: number; lastPurchase: number }>
    : {};

  // Top 10 buyers by SOL spent
  const topBuyers = Object.entries(buyers)
    .sort(([, a], [, b]) => b.totalSol - a.totalSol)
    .slice(0, 10)
    .map(([wallet, stats]) => ({ wallet, ...stats }));

  return jsonResponse({
    global,
    today: todayStats,
    month: monthStats,
    tiers,
    topBuyers,
  }, 200, request, env);
}

async function handleAdminVanityChart(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  let dayKeys: string[] = [];

  if (startParam && endParam) {
    const start = new Date(startParam + 'T00:00:00Z');
    const end = new Date(endParam + 'T00:00:00Z');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return jsonResponse({ error: 'Invalid date format' }, 400, request, env);
    }
    const maxEnd = new Date(start.getTime() + 90 * 86400000);
    const clampedEnd = end > maxEnd ? maxEnd : end;
    const cursor = new Date(start);
    while (cursor <= clampedEnd) {
      dayKeys.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
    for (let i = days - 1; i >= 0; i--) {
      dayKeys.push(daysAgoKey(i));
    }
  }

  const results = await Promise.all(
    dayKeys.map(d => env.STATS.get(`vanity:stats:daily:${d}`))
  );

  const points = dayKeys.map((date, i) => {
    const stats = results[i]
      ? JSON.parse(results[i] as string) as { purchases: number; tokensSold: number; revenueSol: number; tokensUsed: number }
      : { purchases: 0, tokensSold: 0, revenueSol: 0, tokensUsed: 0 };

    return {
      date,
      purchases: stats.purchases,
      tokensSold: stats.tokensSold,
      revenueSol: stats.revenueSol,
      tokensUsed: stats.tokensUsed,
    };
  });

  return jsonResponse(points, 200, request, env);
}

async function handleAdminVanityPurchases(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

  const rawHistory = await env.STATS.get('vanity:history');
  const history = rawHistory
    ? JSON.parse(rawHistory) as Array<{ wallet: string; tier: string; tokens: number; sol: number; signature: string; timestamp: number }>
    : [];

  const start = (page - 1) * limit;
  const end = start + limit;
  const items = history.slice(start, end);

  return jsonResponse({
    items,
    total: history.length,
    page,
    limit,
    totalPages: Math.ceil(history.length / limit),
  }, 200, request, env);
}

// ──────────────────────────────────────────────
// Wallet Chart (PnL over time)
// ──────────────────────────────────────────────

const walletChartCache = new Map<string, { data: unknown; fetchedAt: number }>();
const WALLET_CHART_CACHE_MS = 120_000;
const WALLET_CHART_CACHE_MAX = 100;

async function handleWalletChart(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  if (!wallet || !isValidBase58(wallet)) {
    return jsonResponse({ error: 'Invalid wallet address' }, 400, request, env);
  }

  const now = Date.now();
  const cached = walletChartCache.get(wallet);
  if (cached && now - cached.fetchedAt < WALLET_CHART_CACHE_MS) {
    return jsonResponse(cached.data, 200, request, env);
  }

  try {
    const res = await fetch(`https://data.solanatracker.io/wallet/${wallet}/chart`, {
      headers: { 'x-api-key': env.SOLANA_TRACKER_API_KEY },
    });
    if (!res.ok) {
      return jsonResponse({ error: 'No chart data available' }, 404, request, env);
    }
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      return jsonResponse({ error: 'No chart data available' }, 404, request, env);
    }

    if (walletChartCache.size >= WALLET_CHART_CACHE_MAX) {
      const oldest = walletChartCache.keys().next().value;
      if (oldest) walletChartCache.delete(oldest);
    }
    walletChartCache.set(wallet, { data, fetchedAt: now });

    return jsonResponse(data, 200, request, env);
  } catch {
    return jsonResponse({ error: 'Failed to fetch chart data' }, 502, request, env);
  }
}

// ──────────────────────────────────────────────
// Token Chart (OHLCV candles)
// ──────────────────────────────────────────────

const tokenChartCache = new Map<string, { data: unknown[]; fetchedAt: number }>();
const TOKEN_CHART_CACHE_MS = 60_000;
const TOKEN_CHART_CACHE_MAX = 200;

async function handleTokenChart(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  const url = new URL(request.url);
  const mint = url.searchParams.get('mint');
  if (!mint || !isValidBase58(mint)) {
    return jsonResponse({ error: 'Invalid mint address' }, 400, request, env);
  }

  const now = Date.now();
  const cached = tokenChartCache.get(mint);
  if (cached && now - cached.fetchedAt < TOKEN_CHART_CACHE_MS) {
    return jsonResponse(cached.data, 200, request, env);
  }

  try {
    const res = await fetch(`https://data.solanatracker.io/chart/${mint}`, {
      headers: { 'x-api-key': env.SOLANA_TRACKER_API_KEY },
    });
    if (!res.ok) {
      return jsonResponse({ error: 'No chart data available' }, 404, request, env);
    }
    const raw = await res.json() as Record<string, unknown>;
    const candles = Array.isArray(raw.oclhv) ? raw.oclhv : [];
    const normalized = (candles as Array<Record<string, number>>).map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    if (tokenChartCache.size >= TOKEN_CHART_CACHE_MAX) {
      const oldest = tokenChartCache.keys().next().value;
      if (oldest) tokenChartCache.delete(oldest);
    }
    tokenChartCache.set(mint, { data: normalized, fetchedAt: now });

    return jsonResponse(normalized, 200, request, env);
  } catch {
    return jsonResponse({ error: 'Failed to fetch chart data' }, 502, request, env);
  }
}

// ──────────────────────────────────────────────
// Top Traders
// ──────────────────────────────────────────────

interface TopTrader {
  wallet: string;
  pnl: number;
  bought: number;
  sold: number;
  holding: boolean;
  buys: number;
  sells: number;
}

const topTradersCache = new Map<string, { data: TopTrader[]; fetchedAt: number }>();
const TOP_TRADERS_CACHE_MS = 120_000;
const TOP_TRADERS_CACHE_MAX = 100;

async function handleTopTraders(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  const url = new URL(request.url);
  const mint = url.searchParams.get('mint');
  if (!mint || !isValidBase58(mint)) {
    return jsonResponse({ error: 'Invalid mint address' }, 400, request, env);
  }

  const now = Date.now();
  const cached = topTradersCache.get(mint);
  if (cached && now - cached.fetchedAt < TOP_TRADERS_CACHE_MS) {
    return jsonResponse(cached.data, 200, request, env);
  }

  try {
    const res = await fetch(`https://data.solanatracker.io/top-traders/${mint}`, {
      headers: { 'x-api-key': env.SOLANA_TRACKER_API_KEY },
    });
    if (!res.ok) {
      return jsonResponse({ error: 'No trader data available' }, 404, request, env);
    }
    const raw = await res.json();
    const traders = Array.isArray(raw) ? raw : [];
    const normalized: TopTrader[] = (traders as Array<Record<string, unknown>>).slice(0, 20).map(t => {
      const txCounts = t.tx_counts as Record<string, number> | undefined;
      return {
        wallet: String(t.wallet || ''),
        pnl: typeof t.total === 'number' ? t.total : 0,
        bought: typeof t.total_invested === 'number' ? t.total_invested : 0,
        sold: typeof t.realized === 'number' ? t.realized : 0,
        holding: typeof t.holding === 'number' ? t.holding > 0 : false,
        buys: txCounts?.buys ?? 0,
        sells: txCounts?.sells ?? 0,
      };
    });

    if (topTradersCache.size >= TOP_TRADERS_CACHE_MAX) {
      const oldest = topTradersCache.keys().next().value;
      if (oldest) topTradersCache.delete(oldest);
    }
    topTradersCache.set(mint, { data: normalized, fetchedAt: now });

    return jsonResponse(normalized, 200, request, env);
  } catch {
    return jsonResponse({ error: 'Failed to fetch trader data' }, 502, request, env);
  }
}

// ──────────────────────────────────────────────
// Token Scanner
// ──────────────────────────────────────────────

interface TokenScanResult {
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  risks: Array<{ name: string; description: string; level: string; score: number }>;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  liquidity: number | null;
  lpLockedPct: number | null;
  tokenAge: string | null;
  pairUrl: string | null;
  dexId: string | null;
  mintAuthority: boolean | null;
  freezeAuthority: boolean | null;
  topHolderPct: number | null;
  socials: { twitter: string | null; website: string | null; telegram: string | null };
}

const tokenScanCache = new Map<string, { data: TokenScanResult; fetchedAt: number }>();
const TOKEN_SCAN_CACHE_MS = 30_000;
const TOKEN_SCAN_CACHE_MAX = 200;

async function handleTokenScan(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  const url = new URL(request.url);
  const mint = url.searchParams.get('mint');
  if (!mint || !isValidBase58(mint)) {
    return jsonResponse({ error: 'Invalid mint address' }, 400, request, env);
  }

  const now = Date.now();
  const cached = tokenScanCache.get(mint);
  if (cached && now - cached.fetchedAt < TOKEN_SCAN_CACHE_MS) {
    return jsonResponse(cached.data, 200, request, env);
  }

  const [rugcheckResult, dexscreenerResult, goplusResult] = await Promise.allSettled([
    fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`).then(r => r.ok ? r.json() : null),
    fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`).then(r => r.ok ? r.json() : null),
    fetch(`https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${mint}`).then(r => r.ok ? r.json() : null),
  ]);

  // Parse RugCheck
  let riskScore: number | null = null;
  let riskLevel: string | null = null;
  let risks: TokenScanResult['risks'] = [];
  let lpLockedPct: number | null = null;

  if (rugcheckResult.status === 'fulfilled' && rugcheckResult.value) {
    const rc = rugcheckResult.value as Record<string, unknown>;
    if (typeof rc.score === 'number') riskScore = rc.score;
    if (typeof rc.riskLevel === 'string') riskLevel = rc.riskLevel;
    if (Array.isArray(rc.risks)) {
      risks = (rc.risks as Array<Record<string, unknown>>).map(r => ({
        name: String(r.name || ''),
        description: String(r.description || ''),
        level: String(r.level || 'unknown'),
        score: typeof r.score === 'number' ? r.score : 0,
      }));
    }
    if (typeof rc.score_normalised === 'number') riskScore = rc.score_normalised;
    if (typeof rc.lpLockedPct === 'number') lpLockedPct = rc.lpLockedPct;
  }

  // Parse DexScreener
  let name: string | null = null;
  let symbol: string | null = null;
  let imageUrl: string | null = null;
  let price: number | null = null;
  let marketCap: number | null = null;
  let volume24h: number | null = null;
  let liquidity: number | null = null;
  let tokenAge: string | null = null;
  let pairUrl: string | null = null;
  let dexId: string | null = null;
  let socials = { twitter: null as string | null, website: null as string | null, telegram: null as string | null };

  if (dexscreenerResult.status === 'fulfilled' && dexscreenerResult.value) {
    const pairs = Array.isArray(dexscreenerResult.value) ? dexscreenerResult.value : [];
    // Pick highest liquidity pair
    const best = pairs.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      ((b.liquidity as Record<string, number>)?.usd || 0) - ((a.liquidity as Record<string, number>)?.usd || 0)
    )[0] as Record<string, unknown> | undefined;

    if (best) {
      const baseToken = best.baseToken as Record<string, string> | undefined;
      name = baseToken?.name || null;
      symbol = baseToken?.symbol || null;
      price = typeof best.priceUsd === 'string' ? parseFloat(best.priceUsd) : null;
      marketCap = typeof best.marketCap === 'number' ? best.marketCap : null;
      const vol = best.volume as Record<string, number> | undefined;
      volume24h = vol?.h24 ?? null;
      const liq = best.liquidity as Record<string, number> | undefined;
      liquidity = liq?.usd ?? null;
      pairUrl = typeof best.url === 'string' ? best.url : null;
      dexId = typeof best.dexId === 'string' ? best.dexId : null;

      const info = best.info as Record<string, unknown> | undefined;
      if (info) {
        imageUrl = typeof info.imageUrl === 'string' ? info.imageUrl : null;
        const socialArr = Array.isArray(info.socials) ? info.socials as Array<{ type: string; url: string }> : [];
        socials.twitter = socialArr.find(s => s.type === 'twitter')?.url || null;
        socials.telegram = socialArr.find(s => s.type === 'telegram')?.url || null;
        const websites = Array.isArray(info.websites) ? info.websites as Array<{ url: string }> : [];
        socials.website = websites[0]?.url || null;
      }

      if (typeof best.pairCreatedAt === 'number') {
        const ageMs = now - (best.pairCreatedAt as number);
        const days = Math.floor(ageMs / 86_400_000);
        const hours = Math.floor((ageMs % 86_400_000) / 3_600_000);
        tokenAge = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
      }
    }
  }

  // Parse GoPlus
  let mintAuthority: boolean | null = null;
  let freezeAuthority: boolean | null = null;
  let topHolderPct: number | null = null;

  if (goplusResult.status === 'fulfilled' && goplusResult.value) {
    const gp = goplusResult.value as Record<string, unknown>;
    const result = (gp.result as Record<string, Record<string, unknown>> | undefined)?.[mint];
    if (result) {
      mintAuthority = result.mintable === '1';
      freezeAuthority = result.freezeable === '1';
      if (Array.isArray(result.holders)) {
        const holders = result.holders as Array<{ percent: string }>;
        if (holders.length > 0) {
          topHolderPct = parseFloat(holders[0].percent) * 100;
        }
      }
    }
  }

  const scanResult: TokenScanResult = {
    mint,
    name,
    symbol,
    imageUrl,
    riskScore,
    riskLevel,
    risks,
    price,
    marketCap,
    volume24h,
    liquidity,
    lpLockedPct,
    tokenAge,
    pairUrl,
    dexId,
    mintAuthority,
    freezeAuthority,
    topHolderPct,
    socials,
  };

  // Cache result
  if (tokenScanCache.size >= TOKEN_SCAN_CACHE_MAX) {
    const oldest = tokenScanCache.keys().next().value;
    if (oldest) tokenScanCache.delete(oldest);
  }
  tokenScanCache.set(mint, { data: scanResult, fetchedAt: now });

  return jsonResponse(scanResult, 200, request, env);
}

// ──────────────────────────────────────────────
// Wallet X-Ray (Helius PnL Engine)
// ──────────────────────────────────────────────

interface WalletXRayToken {
  mint: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  invested: number;
  pnl: number;
  realized: number;
  unrealized: number;
  pnlPercent: number;
  trades: number;
  buyTxns: number;
  sellTxns: number;
  holding: boolean;
  currentValue: number;
  totalSold: number;
  lastTradeTime: number;
  investedUsd: number;
  pnlUsd: number;
  realizedUsd: number;
}

interface WalletTransfer {
  type: 'in' | 'out';
  amount: number; // SOL
  counterparty: string;
  timestamp: number;
  signature: string;
}

interface WalletXRayResult {
  wallet: string;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalInvested: number;
  totalPnlUsd: number;
  realizedPnlUsd: number;
  totalInvestedUsd: number;
  winRate: number;
  wins: number;
  losses: number;
  grade: string;
  tokens: WalletXRayToken[];
  transfers: WalletTransfer[];
  pnlHistory: Array<{ time: number; value: number }>;
  pnlHistoryUsd: Array<{ time: number; value: number }>;
}

// In-memory cache: 5 min TTL, 200 entries
const walletXRayCache = new Map<string, { data: WalletXRayResult; fetchedAt: number }>();
const WALLET_XRAY_CACHE_MS = 300_000;
const WALLET_XRAY_CACHE_MAX = 200;

// KV cache key prefix and TTL (20 min)
const WALLET_XRAY_KV_PREFIX = 'xray:';
const WALLET_XRAY_KV_TTL = 1200;

function calculateGrade(winRate: number, totalPnl: number): string {
  if (winRate >= 70 && totalPnl > 0) return 'A+';
  if (winRate >= 60 && totalPnl > 0) return 'A';
  if (winRate >= 50 && totalPnl > 0) return 'B';
  if (winRate >= 40 || totalPnl >= 0) return 'C';
  if (winRate >= 30) return 'D';
  return 'F';
}

// Per-token ledger used during PnL computation
interface TokenLedger {
  totalSolSpent: number;
  totalSolReceived: number;
  totalUsdSpent: number;
  totalUsdReceived: number;
  tokensBought: number;
  tokensSold: number;
  buyTxns: number;
  sellTxns: number;
  lastTradeTime: number;
}

// Historical SOL price lookup
interface PricePoint { ts: number; price: number }

async function fetchSolPriceHistory(fromTs: number, toTs: number): Promise<PricePoint[]> {
  // Pyth Benchmarks TradingView API — hourly resolution for accuracy
  // Max ~5000 bars per request = ~208 days of hourly data
  // For longer ranges, paginate with multiple requests
  const RESOLUTION = '60'; // hourly candles
  const MAX_BARS = 5000;
  const SECS_PER_BAR = 3600; // 1 hour
  const allPoints: PricePoint[] = [];

  try {
    let cursor = fromTs - 3600; // pad start by 1 hour
    const end = toTs + 3600; // pad end by 1 hour
    const maxRequests = 4; // safety limit

    for (let i = 0; i < maxRequests && cursor < end; i++) {
      const chunkEnd = Math.min(cursor + MAX_BARS * SECS_PER_BAR, end);
      const url = `https://benchmarks.pyth.network/v1/shims/tradingview/history?symbol=Crypto.SOL/USD&resolution=${RESOLUTION}&from=${cursor}&to=${chunkEnd}`;
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json() as { t?: number[]; c?: number[]; s?: string };
      if (data.s === 'no_data' || !data.t || !data.c || data.t.length === 0) break;
      for (let j = 0; j < data.t.length; j++) {
        allPoints.push({ ts: data.t[j], price: data.c![j] });
      }
      cursor = data.t[data.t.length - 1] + SECS_PER_BAR;
    }
  } catch { /* return whatever we collected */ }

  return allPoints;
}

function findSolPrice(ts: number, prices: PricePoint[]): number {
  if (prices.length === 0) return 0;
  let lo = 0;
  let hi = prices.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (prices[mid].ts < ts) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(prices[lo - 1].ts - ts) < Math.abs(prices[lo].ts - ts)) {
    return prices[lo - 1].price;
  }
  return prices[lo].price;
}

// Helius Enhanced Transactions API types
interface HeliusParsedTx {
  type: string;
  timestamp: number;
  signature?: string;
  source?: string;
  fee?: number; // lamports
  feePayer?: string;
  events?: Record<string, unknown>;
  nativeTransfers?: Array<{ fromUserAccount: string; toUserAccount: string; amount: number }>;
  tokenTransfers?: Array<{ mint: string; fromUserAccount: string; toUserAccount: string; tokenAmount: number }>;
  accountData?: Array<{ account: string; nativeBalanceChange: number }>;
}

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

// Non-trade token mints to exclude from the token ledger
const XRAY_SKIP_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);

// Step 1: Fetch all transaction signatures (fast — 1000 per page via RPC)
// Also returns earliest/latest blockTime for parallelizing price history fetch
async function fetchAllSignatures(wallet: string, env: Env): Promise<{ sigs: string[]; minTime: number; maxTime: number }> {
  const sigs: string[] = [];
  let before: string | undefined;
  let minTime = Infinity;
  let maxTime = 0;
  const heliusRpc = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;

  for (let i = 0; i < 5; i++) {
    const params: unknown[] = [wallet, { limit: 1000, ...(before ? { before } : {}) }];
    const res = await fetch(heliusRpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params }),
    });
    if (!res.ok) break;
    const json = await res.json() as { result?: Array<{ signature: string; err: unknown; blockTime?: number }> };
    const results = json.result || [];
    if (results.length === 0) break;
    for (const r of results) {
      if (!r.err) sigs.push(r.signature);
      if (r.blockTime) {
        if (r.blockTime < minTime) minTime = r.blockTime;
        if (r.blockTime > maxTime) maxTime = r.blockTime;
      }
    }
    before = results[results.length - 1].signature;
    if (results.length < 1000) break;
  }

  return { sigs, minTime: minTime === Infinity ? 0 : minTime, maxTime };
}

// Parse a single batch with retry on 429 rate limit
async function parseSingleBatch(batch: string[], env: Env): Promise<HeliusParsedTx[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${env.HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: batch }),
    });
    if (res.ok) return res.json() as Promise<HeliusParsedTx[]>;
    if (res.status === 429 || res.status === 503) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // backoff 1s, 2s, 3s
      continue;
    }
    return [];
  }
  return [];
}

// Step 2: Parse signatures in concurrent batches via Helius Enhanced API
async function parseBatches(signatures: string[], env: Env): Promise<HeliusParsedTx[]> {
  const BATCH_SIZE = 100;
  const batches: string[][] = [];
  for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
    batches.push(signatures.slice(i, i + BATCH_SIZE));
  }

  const allParsed: HeliusParsedTx[] = [];
  const CONCURRENT = 12; // 12 concurrent batches for speed

  for (let i = 0; i < batches.length; i += CONCURRENT) {
    const chunk = batches.slice(i, i + CONCURRENT);
    const results = await Promise.allSettled(chunk.map(batch => parseSingleBatch(batch, env)));
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allParsed.push(...r.value);
      }
    }
  }

  return allParsed;
}

// Build per-token ledger from parsed swap transactions
// Uses accountData.nativeBalanceChange as ground truth for SOL amounts —
// this captures ALL SOL flow including internal program transfers that don't
// appear in nativeTransfers (e.g. old PumpFun bonding curve returns).
function buildTokenLedgers(
  txs: HeliusParsedTx[], wallet: string, priceHistory: PricePoint[]
): { ledgers: Map<string, TokenLedger>; pnlHistory: Array<{ time: number; value: number }>; pnlHistoryUsd: Array<{ time: number; value: number }> } {
  const ledgers = new Map<string, TokenLedger>();

  function getLedger(mint: string): TokenLedger {
    let l = ledgers.get(mint);
    if (!l) {
      l = { totalSolSpent: 0, totalSolReceived: 0, totalUsdSpent: 0, totalUsdReceived: 0, tokensBought: 0, tokensSold: 0, buyTxns: 0, sellTxns: 0, lastTradeTime: 0 };
      ledgers.set(mint, l);
    }
    return l;
  }

  // Process transactions in chronological order so the PnL chart is time-ordered.
  // getSignaturesForAddress returns newest-first so we must sort ascending.
  const sorted = [...txs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const pnlPoints: Array<{ time: number; value: number }> = [];
  const pnlPointsUsd: Array<{ time: number; value: number }> = [];

  for (const tx of sorted) {
    const ts = tx.timestamp || 0;
    const tokenTransfers = tx.tokenTransfers || [];

    let nativeDelta = 0;
    if (tx.accountData) {
      for (const ad of tx.accountData) {
        if (ad.account === wallet) {
          nativeDelta = ad.nativeBalanceChange / 1e9;
          break;
        }
      }
    }
    if (tx.fee && tx.feePayer === wallet) {
      nativeDelta += tx.fee / 1e9;
    }

    let wsolDelta = 0;
    for (const tt of tokenTransfers) {
      if (tt.mint === WSOL_MINT && tt.tokenAmount > 0) {
        if (tt.toUserAccount === wallet) wsolDelta += tt.tokenAmount;
        if (tt.fromUserAccount === wallet) wsolDelta -= tt.tokenAmount;
      }
    }

    const solDelta = Math.abs(wsolDelta) > 0 ? wsolDelta : nativeDelta;

    const tokensReceived: Array<{ mint: string; amount: number }> = [];
    const tokensSent: Array<{ mint: string; amount: number }> = [];

    for (const tt of tokenTransfers) {
      if (tt.mint === WSOL_MINT || XRAY_SKIP_MINTS.has(tt.mint)) continue;
      if (tt.tokenAmount <= 0) continue;
      if (tt.toUserAccount === wallet) {
        tokensReceived.push({ mint: tt.mint, amount: tt.tokenAmount });
      }
      if (tt.fromUserAccount === wallet) {
        tokensSent.push({ mint: tt.mint, amount: tt.tokenAmount });
      }
    }

    if (tokensReceived.length === 0 && tokensSent.length === 0) continue;

    const hasBuy = tokensReceived.length > 0 && tokensSent.length === 0;
    const hasSell = tokensSent.length > 0 && tokensReceived.length === 0;
    const hasT2T = tokensReceived.length > 0 && tokensSent.length > 0;

    const solPriceAtTrade = findSolPrice(ts, priceHistory);

    if (hasBuy) {
      const solSpent = Math.max(0, -solDelta);
      for (const ti of tokensReceived) {
        const ledger = getLedger(ti.mint);
        const solForThis = tokensReceived.length === 1 ? solSpent : solSpent / tokensReceived.length;
        ledger.totalSolSpent += solForThis;
        ledger.totalUsdSpent += solForThis * solPriceAtTrade;
        ledger.tokensBought += ti.amount;
        ledger.buyTxns++;
        if (ts > ledger.lastTradeTime) ledger.lastTradeTime = ts;
      }
    } else if (hasSell) {
      const solReceived = Math.max(0, solDelta);
      for (const to of tokensSent) {
        const ledger = getLedger(to.mint);
        const solForThis = tokensSent.length === 1 ? solReceived : solReceived / tokensSent.length;
        ledger.totalSolReceived += solForThis;
        ledger.totalUsdReceived += solForThis * solPriceAtTrade;
        ledger.tokensSold += to.amount;
        ledger.sellTxns++;
        if (ts > ledger.lastTradeTime) ledger.lastTradeTime = ts;
      }
    } else if (hasT2T) {
      let estimatedSolValue = 0;
      if (Math.abs(solDelta) < 0.001) {
        for (const to of tokensSent) {
          const existingLedger = ledgers.get(to.mint);
          if (existingLedger && existingLedger.tokensBought > 0) {
            const avgCost = existingLedger.totalSolSpent / existingLedger.tokensBought;
            estimatedSolValue += to.amount * avgCost;
          }
        }
      }

      for (const to of tokensSent) {
        const ledger = getLedger(to.mint);
        if (solDelta > 0) {
          const solForThis = solDelta / tokensSent.length;
          ledger.totalSolReceived += solForThis;
          ledger.totalUsdReceived += solForThis * solPriceAtTrade;
        } else if (Math.abs(solDelta) < 0.001 && estimatedSolValue > 0) {
          const existingLedger = ledgers.get(to.mint);
          if (existingLedger && existingLedger.tokensBought > 0) {
            const avgCost = existingLedger.totalSolSpent / existingLedger.tokensBought;
            const solForThis = to.amount * avgCost;
            ledger.totalSolReceived += solForThis;
            ledger.totalUsdReceived += solForThis * solPriceAtTrade;
          }
        }
        ledger.tokensSold += to.amount;
        ledger.sellTxns++;
        if (ts > ledger.lastTradeTime) ledger.lastTradeTime = ts;
      }
      for (const ti of tokensReceived) {
        const ledger = getLedger(ti.mint);
        if (solDelta < 0) {
          const solForThis = Math.abs(solDelta) / tokensReceived.length;
          ledger.totalSolSpent += solForThis;
          ledger.totalUsdSpent += solForThis * solPriceAtTrade;
        } else if (Math.abs(solDelta) < 0.001 && estimatedSolValue > 0) {
          const solForThis = estimatedSolValue / tokensReceived.length;
          ledger.totalSolSpent += solForThis;
          ledger.totalUsdSpent += solForThis * solPriceAtTrade;
        }
        ledger.tokensBought += ti.amount;
        ledger.buyTxns++;
        if (ts > ledger.lastTradeTime) ledger.lastTradeTime = ts;
      }
    }

    // Record PnL chart point after each trade using the SAME ledger state
    // that produces the hero's realizedPnl / realizedPnlUsd.
    if (ts > 0) {
      let runningRealized = 0;
      let runningRealizedUsd = 0;
      for (const [, l] of ledgers) {
        if (l.totalSolSpent < 0.001 && l.totalSolReceived < 0.001) continue;
        if (l.tokensSold > 0) {
          const avgCost = l.tokensBought > 0 ? l.totalSolSpent / l.tokensBought : 0;
          runningRealized += l.totalSolReceived - (l.tokensSold * avgCost);
          const avgCostUsd = l.tokensBought > 0 ? l.totalUsdSpent / l.tokensBought : 0;
          runningRealizedUsd += l.totalUsdReceived - (l.tokensSold * avgCostUsd);
        }
      }
      const solVal = Math.round(runningRealized * 10000) / 10000;
      const usdVal = Math.round(runningRealizedUsd * 100) / 100;
      // Deduplicate: if same second as previous point, overwrite
      if (pnlPoints.length > 0 && pnlPoints[pnlPoints.length - 1].time === ts) {
        pnlPoints[pnlPoints.length - 1].value = solVal;
        pnlPointsUsd[pnlPointsUsd.length - 1].value = usdVal;
      } else {
        pnlPoints.push({ time: ts, value: solVal });
        pnlPointsUsd.push({ time: ts, value: usdVal });
      }
    }
  }

  return { ledgers, pnlHistory: pnlPoints, pnlHistoryUsd: pnlPointsUsd };
}

// buildPnlHistory is no longer needed — chart data is computed inside buildTokenLedgers
// from the exact same ledger state, guaranteeing the chart's final value matches the hero.

// Extract SOL transfer history from parsed TRANSFER transactions
function extractTransfers(txs: HeliusParsedTx[], wallet: string): WalletTransfer[] {
  const transfers: WalletTransfer[] = [];

  for (const tx of txs) {
    const nativeTransfers = tx.nativeTransfers || [];
    for (const nt of nativeTransfers) {
      if (nt.fromUserAccount === wallet && nt.toUserAccount !== wallet) {
        transfers.push({
          type: 'out',
          amount: nt.amount / 1e9,
          counterparty: nt.toUserAccount,
          timestamp: tx.timestamp || 0,
          signature: tx.signature || '',
        });
      }
      if (nt.toUserAccount === wallet && nt.fromUserAccount !== wallet) {
        transfers.push({
          type: 'in',
          amount: nt.amount / 1e9,
          counterparty: nt.fromUserAccount,
          timestamp: tx.timestamp || 0,
          signature: tx.signature || '',
        });
      }
    }
  }

  // Sort by timestamp descending (newest first)
  transfers.sort((a, b) => b.timestamp - a.timestamp);
  return transfers;
}

// Get current SOL price from the prices cache
async function getSolPrice(env: Env): Promise<number> {
  if (cachedPrices) {
    try {
      const parsed = JSON.parse(cachedPrices.data) as { solana?: { usd?: number } };
      if (parsed.solana?.usd) return parsed.solana.usd;
    } catch { /* fall through */ }
  }
  // Fetch fresh if no cache
  try {
    const res = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_SOL_ID}`,
    );
    if (res.ok) {
      const pyth = await res.json() as PythResponse;
      for (const entry of pyth.parsed) {
        if (entry.id === PYTH_SOL_ID.slice(2)) {
          return parseFloat(entry.price.price) * Math.pow(10, entry.price.expo);
        }
      }
    }
  } catch { /* ignore */ }
  return 0;
}

async function handleWalletXRay(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  if (!wallet || !isValidBase58(wallet)) {
    return jsonResponse({ error: 'Invalid wallet address' }, 400, request, env);
  }

  const now = Date.now();
  const noCache = url.searchParams.get('nocache') === '1';

  // Check in-memory cache first
  if (!noCache) {
    const memCached = walletXRayCache.get(wallet);
    if (memCached && now - memCached.fetchedAt < WALLET_XRAY_CACHE_MS) {
      return jsonResponse(memCached.data, 200, request, env, 'public, s-maxage=120, stale-while-revalidate=300');
    }
  }

  // Check KV persistent cache
  try {
    const kvData = noCache ? null : await env.STATS.get(`${WALLET_XRAY_KV_PREFIX}${wallet}`);
    if (kvData) {
      const parsed = JSON.parse(kvData) as WalletXRayResult;
      // Warm in-memory cache
      if (walletXRayCache.size >= WALLET_XRAY_CACHE_MAX) {
        const oldest = walletXRayCache.keys().next().value;
        if (oldest) walletXRayCache.delete(oldest);
      }
      walletXRayCache.set(wallet, { data: parsed, fetchedAt: now });
      return jsonResponse(parsed, 200, request, env, 'public, s-maxage=120, stale-while-revalidate=300');
    }
  } catch { /* KV miss, compute fresh */ }

  // 1. Fetch all signatures then parse in concurrent batches
  // Price history runs in parallel with parsing (using blockTimes from signatures)
  let allTxs: HeliusParsedTx[];
  let priceHistory: PricePoint[] = [];
  try {
    const { sigs: signatures, minTime, maxTime } = await fetchAllSignatures(wallet, env);
    if (signatures.length === 0) {
      const empty: WalletXRayResult = {
        wallet, totalPnl: 0, realizedPnl: 0, unrealizedPnl: 0,
        totalInvested: 0, totalPnlUsd: 0, realizedPnlUsd: 0, totalInvestedUsd: 0,
        winRate: 0, wins: 0, losses: 0, grade: 'C', tokens: [], transfers: [], pnlHistory: [], pnlHistoryUsd: [],
      };
      return jsonResponse(empty, 200, request, env);
    }

    // Parse batches and fetch price history in parallel
    const [txResult, priceResult] = await Promise.allSettled([
      parseBatches(signatures, env),
      minTime > 0 && maxTime > 0 ? fetchSolPriceHistory(minTime, maxTime) : Promise.resolve([]),
    ]);

    allTxs = txResult.status === 'fulfilled' ? txResult.value : [];
    priceHistory = priceResult.status === 'fulfilled' ? priceResult.value : [];

    if (allTxs.length === 0) {
      throw new Error('No transactions parsed');
    }
  } catch {
    return jsonResponse({ error: 'Failed to fetch transaction history' }, 502, request, env);
  }

  // Split by type in code
  const swapTxs = allTxs.filter(tx => tx.type === 'SWAP');
  const transferTxs = allTxs.filter(tx => tx.type === 'TRANSFER');

  // 2. Extract SOL transfers
  const transfers = extractTransfers(transferTxs, wallet);

  if (swapTxs.length === 0) {
    const empty: WalletXRayResult = {
      wallet, totalPnl: 0, realizedPnl: 0, unrealizedPnl: 0,
      totalInvested: 0, totalPnlUsd: 0, realizedPnlUsd: 0, totalInvestedUsd: 0,
      winRate: 0, wins: 0, losses: 0, grade: 'C', tokens: [], transfers, pnlHistory: [], pnlHistoryUsd: [],
    };
    return jsonResponse(empty, 200, request, env);
  }

  // 3. Build per-token ledgers from swap transactions (with price history for USD PnL)
  // pnlHistory is computed inside the same loop from the same ledger state — guaranteed match
  const { ledgers, pnlHistory, pnlHistoryUsd } = buildTokenLedgers(swapTxs, wallet, priceHistory);

  if (ledgers.size === 0) {
    const empty: WalletXRayResult = {
      wallet, totalPnl: 0, realizedPnl: 0, unrealizedPnl: 0,
      totalInvested: 0, winRate: 0, wins: 0, losses: 0, grade: 'C', tokens: [], transfers, pnlHistory: [], pnlHistoryUsd: [],
      totalPnlUsd: 0, realizedPnlUsd: 0, totalInvestedUsd: 0,
    };
    return jsonResponse(empty, 200, request, env);
  }

  // 4. Single DexScreener call for ALL mints — prices + enrichment in one pass
  const heldMints = new Set<string>();
  for (const [mint, ledger] of ledgers) {
    if (ledger.tokensBought > ledger.tokensSold && ledger.totalSolSpent >= 0.01) {
      heldMints.add(mint);
    }
  }

  const currentPriceMap = new Map<string, number>(); // mint → price in USD
  const enrichMap = new Map<string, { image: string; name: string; symbol: string }>();
  let solPrice = await getSolPrice(env);

  // Fetch all mints in one batch (prices for held, enrichment for all)
  const allMints = Array.from(ledgers.keys());
  if (allMints.length > 0) {
    try {
      const CHUNK = 30;
      const chunks: string[][] = [];
      for (let i = 0; i < allMints.length; i += CHUNK) {
        chunks.push(allMints.slice(i, i + CHUNK));
      }

      const dexResults = await Promise.allSettled(
        chunks.map(chunk =>
          fetch(`https://api.dexscreener.com/tokens/v1/solana/${chunk.join(',')}`).then(r => r.ok ? r.json() : null)
        )
      );

      for (const dr of dexResults) {
        if (dr.status === 'fulfilled' && Array.isArray(dr.value)) {
          for (const pair of dr.value as Array<Record<string, unknown>>) {
            const bt = pair.baseToken as Record<string, string> | undefined;
            const info = pair.info as Record<string, unknown> | undefined;
            if (!bt?.address) continue;

            // Extract price for held tokens
            if (heldMints.has(bt.address) && !currentPriceMap.has(bt.address)) {
              const priceUsd = typeof pair.priceUsd === 'string' ? parseFloat(pair.priceUsd) : 0;
              if (priceUsd > 0) currentPriceMap.set(bt.address, priceUsd);
            }

            // Extract enrichment data for all tokens
            if (!enrichMap.has(bt.address)) {
              enrichMap.set(bt.address, {
                image: typeof info?.imageUrl === 'string' ? info.imageUrl : '',
                name: bt.name || '',
                symbol: bt.symbol || '',
              });
            }
          }
        }
      }
    } catch {
      // Non-critical
    }
  }

  // 5. Compute PnL per token (average cost basis)
  const tokenEntries: WalletXRayToken[] = [];

  for (const [mint, ledger] of ledgers) {
    // Skip dust tokens (< 0.001 SOL invested and < 0.001 SOL received)
    if (ledger.totalSolSpent < 0.001 && ledger.totalSolReceived < 0.001) continue;

    let tokensHolding = ledger.tokensBought - ledger.tokensSold;
    // Dust threshold: if holding < 0.5% of bought, treat as fully sold
    if (tokensHolding > 0 && ledger.tokensBought > 0 && tokensHolding / ledger.tokensBought < 0.005) {
      tokensHolding = 0;
    }

    const avgCostBasis = ledger.tokensBought > 0 ? ledger.totalSolSpent / ledger.tokensBought : 0;

    // Realized PnL = SOL received from sells - (tokens sold × avg cost basis)
    const realized = ledger.totalSolReceived - (ledger.tokensSold * avgCostBasis);

    // Unrealized PnL: convert current token price (USD) to SOL
    let unrealized = 0;
    let currentValue = 0;
    const isHolding = tokensHolding > 0;
    if (isHolding && solPrice > 0) {
      const priceUsd = currentPriceMap.get(mint) || 0;
      if (priceUsd > 0) {
        const priceInSol = priceUsd / solPrice;
        currentValue = tokensHolding * priceInSol;
        unrealized = currentValue - (tokensHolding * avgCostBasis);
      }
      // If no price data for held token, unrealized stays 0 (unknown, not counted as loss)
    }

    const pnl = realized + unrealized;
    const invested = ledger.totalSolSpent;

    // USD PnL (historical prices at time of each trade)
    const avgUsdCostBasis = ledger.tokensBought > 0 ? ledger.totalUsdSpent / ledger.tokensBought : 0;
    const realizedUsd = ledger.totalUsdReceived - (ledger.tokensSold * avgUsdCostBasis);
    // For unrealized USD: use current token price directly (already in USD)
    let unrealizedUsd = 0;
    if (isHolding) {
      const priceUsd = currentPriceMap.get(mint) || 0;
      if (priceUsd > 0) {
        unrealizedUsd = (tokensHolding * priceUsd) - (tokensHolding * avgUsdCostBasis);
      }
    }
    const pnlUsd = realizedUsd + unrealizedUsd;

    tokenEntries.push({
      mint,
      symbol: '???',
      name: 'Unknown',
      imageUrl: null,
      invested,
      pnl,
      realized,
      unrealized,
      pnlPercent: invested > 0 ? (pnl / invested) * 100 : 0,
      trades: ledger.buyTxns + ledger.sellTxns,
      buyTxns: ledger.buyTxns,
      sellTxns: ledger.sellTxns,
      holding: isHolding,
      currentValue,
      totalSold: ledger.totalSolReceived,
      lastTradeTime: ledger.lastTradeTime,
      investedUsd: ledger.totalUsdSpent,
      pnlUsd,
      realizedUsd,
    });
  }

  // 6. Aggregate stats
  let totalPnl = 0;
  let realizedPnl = 0;
  let unrealizedPnl = 0;
  let totalInvested = 0;
  let totalPnlUsd = 0;
  let realizedPnlUsd = 0;
  let totalInvestedUsd = 0;
  let wins = 0;
  let losses = 0;

  for (const t of tokenEntries) {
    totalPnl += t.pnl;
    realizedPnl += t.realized;
    unrealizedPnl += t.unrealized;
    totalInvested += t.invested;
    totalPnlUsd += t.pnlUsd;
    realizedPnlUsd += t.realizedUsd;
    totalInvestedUsd += t.investedUsd;

    // Win/loss counting:
    // - Closed positions (has sells, not holding): count based on realized PnL
    // - Active positions with price data: count based on total PnL
    // - Active positions WITHOUT price data (dead tokens, no sells): skip — outcome unknown
    if (t.sellTxns > 0 && !t.holding) {
      // Closed position — use realized PnL
      if (t.realized > 0) wins++;
      else if (t.realized < 0) losses++;
    } else if (t.holding && (t.currentValue > 0 || t.sellTxns > 0)) {
      // Active position with price data or partial sells — use total PnL
      if (t.pnl > 0) wins++;
      else if (t.pnl < 0) losses++;
    }
    // Tokens with only buys and no price data are NOT counted (outcome unknown)
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const grade = calculateGrade(winRate, totalPnl);

  // Sort by absolute PnL — keep all for accuracy, frontend handles pagination
  tokenEntries.sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  const topTokens = tokenEntries;

  // 7. Apply enrichment data (already fetched in step 4)
  for (const token of topTokens) {
    const e = enrichMap.get(token.mint);
    if (e) {
      if (!token.imageUrl && e.image) token.imageUrl = e.image;
      if (token.name === 'Unknown' && e.name) token.name = e.name;
      if (token.symbol === '???' && e.symbol) token.symbol = e.symbol;
    }
  }

  const result: WalletXRayResult = {
    wallet,
    totalPnl,
    realizedPnl,
    unrealizedPnl,
    totalInvested,
    totalPnlUsd: Math.round(totalPnlUsd * 100) / 100,
    realizedPnlUsd: Math.round(realizedPnlUsd * 100) / 100,
    totalInvestedUsd: Math.round(totalInvestedUsd * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    wins,
    losses,
    grade,
    tokens: topTokens,
    transfers,
    pnlHistory,
    pnlHistoryUsd,
  };

  // Cache in memory
  if (walletXRayCache.size >= WALLET_XRAY_CACHE_MAX) {
    const oldest = walletXRayCache.keys().next().value;
    if (oldest) walletXRayCache.delete(oldest);
  }
  walletXRayCache.set(wallet, { data: result, fetchedAt: now });

  // Cache in KV (non-blocking)
  try {
    await env.STATS.put(`${WALLET_XRAY_KV_PREFIX}${wallet}`, JSON.stringify(result), { expirationTtl: WALLET_XRAY_KV_TTL });
  } catch { /* non-critical */ }

  return jsonResponse(result, 200, request, env, 'public, s-maxage=120, stale-while-revalidate=300');
}

// ──────────────────────────────────────────────
// Wallet Batch Info (for saved wallets)
// ──────────────────────────────────────────────

const walletBatchCache = new Map<string, { data: Record<string, { balanceSol: number; lastActiveTs: number | null }>; fetchedAt: number }>();
const WALLET_BATCH_CACHE_MS = 30_000;

async function handleWalletBatchInfo(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  const url = new URL(request.url);
  const walletsParam = url.searchParams.get('wallets');
  if (!walletsParam) {
    return jsonResponse({ error: 'Missing wallets parameter' }, 400, request, env);
  }

  const wallets = walletsParam.split(',').filter(w => isValidBase58(w.trim())).map(w => w.trim());
  if (wallets.length === 0) {
    return jsonResponse({ error: 'No valid wallet addresses' }, 400, request, env);
  }
  if (wallets.length > 50) {
    return jsonResponse({ error: 'Maximum 50 wallets allowed' }, 400, request, env);
  }

  // Check in-memory cache
  const cacheKey = wallets.slice().sort().join(',');
  const now = Date.now();
  const cached = walletBatchCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < WALLET_BATCH_CACHE_MS) {
    return jsonResponse(cached.data, 200, request, env);
  }

  const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;

  try {
    // Batch fetch SOL balances via getMultipleAccounts (1 RPC call)
    const accountsRes = await fetch(heliusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getMultipleAccounts',
        params: [wallets, { encoding: 'jsonParsed' }],
      }),
    });
    const accountsData = await accountsRes.json() as {
      result?: { value: Array<{ lamports: number } | null> };
    };
    const accounts = accountsData?.result?.value || [];

    // Fetch last active timestamp per wallet (parallel, limit:1 sig each)
    const sigPromises = wallets.map(async (wallet) => {
      try {
        const res = await fetch(heliusUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignaturesForAddress',
            params: [wallet, { limit: 1 }],
          }),
        });
        const data = await res.json() as {
          result?: Array<{ blockTime?: number }>;
        };
        const sigs = data?.result || [];
        return sigs.length > 0 && sigs[0].blockTime ? sigs[0].blockTime * 1000 : null;
      } catch {
        return null;
      }
    });

    const lastActiveTimes = await Promise.all(sigPromises);

    // Build result
    const result: Record<string, { balanceSol: number; lastActiveTs: number | null }> = {};
    wallets.forEach((wallet, i) => {
      const account = accounts[i];
      const lamports = account ? account.lamports : 0;
      result[wallet] = {
        balanceSol: lamports / 1_000_000_000,
        lastActiveTs: lastActiveTimes[i],
      };
    });

    // Cache result
    if (walletBatchCache.size >= 100) {
      const oldest = walletBatchCache.keys().next().value;
      if (oldest !== undefined) walletBatchCache.delete(oldest);
    }
    walletBatchCache.set(cacheKey, { data: result, fetchedAt: now });

    return jsonResponse(result, 200, request, env);
  } catch (err) {
    return jsonResponse({ error: 'Failed to fetch wallet info' }, 500, request, env);
  }
}

// ──────────────────────────────────────────────
// Feature Requests
// ──────────────────────────────────────────────

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  contact?: string;
  submittedAt: number;
  status: 'pending' | 'noted' | 'planned' | 'done' | 'dismissed';
}

const featureRateLimitMap = new Map<string, number>();

async function handleFeatureRequest(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limit: 1 request per minute per IP
  const now = Date.now();
  const lastRequest = featureRateLimitMap.get(ip);
  if (lastRequest && now - lastRequest < 60_000) {
    return jsonResponse({ error: 'Please wait a minute before submitting another request' }, 429, request, env);
  }

  let body: { title?: string; description?: string; contact?: string };
  try {
    body = await request.json() as { title?: string; description?: string; contact?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { title, description, contact } = body;

  if (!title || typeof title !== 'string' || title.length < 3 || title.length > 100) {
    return jsonResponse({ error: 'Title must be 3-100 characters' }, 400, request, env);
  }
  if (!description || typeof description !== 'string' || description.length < 10 || description.length > 500) {
    return jsonResponse({ error: 'Description must be 10-500 characters' }, 400, request, env);
  }
  if (contact !== undefined && contact !== null && typeof contact === 'string' && contact.length > 100) {
    return jsonResponse({ error: 'Contact must be under 100 characters' }, 400, request, env);
  }

  const id = `feature-request:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const featureRequest: FeatureRequest = {
    id,
    title: title.trim(),
    description: description.trim(),
    contact: (typeof contact === 'string' && contact.trim()) ? contact.trim() : undefined,
    submittedAt: Date.now(),
    status: 'pending',
  };

  // Store the request
  await env.STATS.put(id, JSON.stringify(featureRequest));

  // Update index (prepend, max 200)
  const rawList = await env.STATS.get('feature-requests:list');
  const list: string[] = rawList ? JSON.parse(rawList) : [];
  list.unshift(id);
  if (list.length > 200) list.length = 200;
  await env.STATS.put('feature-requests:list', JSON.stringify(list));

  // Record rate limit
  featureRateLimitMap.set(ip, now);

  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleAdminFeatureRequests(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  const rawList = await env.STATS.get('feature-requests:list');
  const list: string[] = rawList ? JSON.parse(rawList) : [];

  const requests: FeatureRequest[] = [];
  // Fetch in batches of 25
  for (let i = 0; i < list.length; i += 25) {
    const batch = list.slice(i, i + 25);
    const results = await Promise.all(batch.map(id => env.STATS.get(id)));
    for (const raw of results) {
      if (raw) {
        requests.push(JSON.parse(raw) as FeatureRequest);
      }
    }
  }

  return jsonResponse({ requests }, 200, request, env);
}

async function handleAdminFeatureRequestUpdate(request: Request, env: Env): Promise<Response> {
  if (!(await verifyAdmin(request, env))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
  }

  let body: { id?: string; status?: string };
  try {
    body = await request.json() as { id?: string; status?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { id, status } = body;
  if (!id || typeof id !== 'string') {
    return jsonResponse({ error: 'Invalid id' }, 400, request, env);
  }
  const validStatuses = ['noted', 'planned', 'done', 'dismissed'];
  if (!status || !validStatuses.includes(status)) {
    return jsonResponse({ error: 'Invalid status' }, 400, request, env);
  }

  const raw = await env.STATS.get(id);
  if (!raw) {
    return jsonResponse({ error: 'Request not found' }, 404, request, env);
  }

  const featureRequest = JSON.parse(raw) as FeatureRequest;
  featureRequest.status = status as FeatureRequest['status'];
  await env.STATS.put(id, JSON.stringify(featureRequest));

  return jsonResponse({ ok: true }, 200, request, env);
}

// ──────────────────────────────────────────────
// Active Users (public)
// ──────────────────────────────────────────────

async function handleActiveUsers(request: Request, env: Env): Promise<Response> {
  const raw = await env.STATS.get('stats:activeVisitors');
  const active = raw ? parseInt(raw, 10) : 0;
  return jsonResponse({ active }, 200, request, env);
}

// ──────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    // Route: POST /api/rpc
    if (url.pathname === '/api/rpc' && request.method === 'POST') {
      return handleRpc(request, env);
    }

    // Route: GET /api/prices
    if (url.pathname === '/api/prices' && request.method === 'GET') {
      return handlePrices(request, env);
    }

    // Route: GET /api/stats
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      return handleGetStats(request, env);
    }

    // Route: POST /api/stats
    if (url.pathname === '/api/stats' && request.method === 'POST') {
      return handlePostStats(request, env);
    }

    // Route: GET /api/stats/wallet — per-wallet reclaim stats
    if (url.pathname === '/api/stats/wallet' && request.method === 'GET') {
      return handleGetWalletStats(request, env);
    }

    // Route: GET /api/stats/recent
    if (url.pathname === '/api/stats/recent' && request.method === 'GET') {
      const raw = await env.STATS.get('stats:recent');
      const recent: RecentReclaim[] = raw ? JSON.parse(raw) : [];
      return jsonResponse(recent, 200, request, env);
    }

    // Route: GET /api/hackathon/tokens
    if (url.pathname === '/api/hackathon/tokens' && request.method === 'GET') {
      return handleHackathonTokens(request, env);
    }

    // Route: POST /api/hackathon/submit
    if (url.pathname === '/api/hackathon/submit' && request.method === 'POST') {
      return handleHackathonSubmit(request, env);
    }

    // Analytics routes (public, anonymous)
    if (url.pathname === '/api/analytics/heartbeat' && request.method === 'POST') {
      return handleHeartbeat(request, env);
    }

    if (url.pathname === '/api/analytics/pageview' && request.method === 'POST') {
      return handlePageview(request, env);
    }

    if (url.pathname === '/api/analytics/social' && request.method === 'POST') {
      return handleSocialClick(request, env);
    }

    // Admin routes (protected)
    if (url.pathname === '/api/admin/verify' && request.method === 'POST') {
      return handleAdminVerify(request, env);
    }

    if (url.pathname === '/api/admin/dashboard' && request.method === 'GET') {
      return handleAdminDashboard(request, env);
    }

    if (url.pathname === '/api/admin/reclaims' && request.method === 'GET') {
      return handleAdminReclaims(request, env);
    }

    if (url.pathname === '/api/admin/visitors' && request.method === 'GET') {
      return handleAdminVisitors(request, env);
    }

    if (url.pathname === '/api/admin/chart' && request.method === 'GET') {
      return handleAdminChart(request, env);
    }

    // Admin hackathon submission routes (protected)
    if (url.pathname === '/api/admin/hackathon/submissions' && request.method === 'GET') {
      return handleAdminHackathonSubmissions(request, env);
    }

    if (url.pathname === '/api/admin/hackathon/approve' && request.method === 'POST') {
      return handleAdminHackathonApprove(request, env);
    }

    if (url.pathname === '/api/admin/hackathon/reject' && request.method === 'POST') {
      return handleAdminHackathonReject(request, env);
    }

    // TOTP management routes (protected)
    if (url.pathname === '/api/admin/totp/status' && request.method === 'GET') {
      return handleTOTPStatus(request, env);
    }

    if (url.pathname === '/api/admin/totp/setup' && request.method === 'POST') {
      return handleTOTPSetup(request, env);
    }

    if (url.pathname === '/api/admin/totp/confirm' && request.method === 'POST') {
      return handleTOTPConfirm(request, env);
    }

    if (url.pathname === '/api/admin/totp/disable' && request.method === 'DELETE') {
      return handleTOTPDisable(request, env);
    }

    // Admin vanity routes (protected)
    if (url.pathname === '/api/admin/vanity/dashboard' && request.method === 'GET') {
      return handleAdminVanityDashboard(request, env);
    }

    if (url.pathname === '/api/admin/vanity/chart' && request.method === 'GET') {
      return handleAdminVanityChart(request, env);
    }

    if (url.pathname === '/api/admin/vanity/purchases' && request.method === 'GET') {
      return handleAdminVanityPurchases(request, env);
    }

    // Vanity token routes (public, wallet-authenticated via on-chain verification)
    if (url.pathname === '/api/vanity/stats' && request.method === 'GET') {
      return handleGetVanityWalletStats(request, env);
    }

    if (url.pathname === '/api/vanity/balance' && request.method === 'GET') {
      return handleVanityBalance(request, env);
    }

    if (url.pathname === '/api/vanity/purchase' && request.method === 'POST') {
      return handleVanityPurchase(request, env);
    }

    if (url.pathname === '/api/vanity/deduct' && request.method === 'POST') {
      return handleVanityDeduct(request, env);
    }

    // Chart & Trader data (public, free)
    if (url.pathname === '/api/wallet-chart' && request.method === 'GET') {
      return handleWalletChart(request, env);
    }

    if (url.pathname === '/api/token-chart' && request.method === 'GET') {
      return handleTokenChart(request, env);
    }

    if (url.pathname === '/api/top-traders' && request.method === 'GET') {
      return handleTopTraders(request, env);
    }

    // Token Scanner & Wallet X-Ray (public, free)
    if (url.pathname === '/api/token-scan' && request.method === 'GET') {
      return handleTokenScan(request, env);
    }

    if (url.pathname === '/api/wallet-xray' && request.method === 'GET') {
      return handleWalletXRay(request, env);
    }

    if (url.pathname === '/api/wallet-batch-info' && request.method === 'GET') {
      return handleWalletBatchInfo(request, env);
    }

    // Feature request routes
    if (url.pathname === '/api/feature-request' && request.method === 'POST') {
      return handleFeatureRequest(request, env);
    }

    if (url.pathname === '/api/admin/feature-requests' && request.method === 'GET') {
      return handleAdminFeatureRequests(request, env);
    }

    if (url.pathname === '/api/admin/feature-requests/update' && request.method === 'POST') {
      return handleAdminFeatureRequestUpdate(request, env);
    }

    // Active users (public)
    if (url.pathname === '/api/analytics/active' && request.method === 'GET') {
      return handleActiveUsers(request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404, request, env);
  },

  // Cron Trigger: count active visitors every minute and cache the result
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    let totalVisitors = 0;
    let cursor: string | undefined;

    do {
      const result = await env.STATS.list({
        prefix: 'visitor:',
        ...(cursor ? { cursor } : {}),
      });
      totalVisitors += result.keys.length;
      cursor = result.list_complete ? undefined : result.cursor;
    } while (cursor);

    await env.STATS.put('stats:activeVisitors', String(totalVisitors));
  },
};
