interface Env {
  STATS: KVNamespace;
  HELIUS_API_KEY: string;
  ADMIN_TOKEN: string;
  ENVIRONMENT: string;
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
const ALLOWED_SOCIAL_BUTTONS = new Set(['github', 'x', 'share-x', 'built-by']);

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
]);

// In-memory rate limiting (per-isolate, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

// Stricter rate limit for admin auth attempts
const adminRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const ADMIN_RATE_LIMIT = 5;
const ADMIN_RATE_WINDOW_MS = 60_000;

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
    origin === 'https://solreclaimer.net' ||
    origin === 'https://www.solreclaimer.net' ||
    origin.startsWith('http://localhost:');

  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://solreclaimer.net',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, solana-client, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status: number, request: Request, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
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

async function handlePostStats(request: Request, env: Env): Promise<Response> {
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
    visitorList,
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
    env.STATS.list({ prefix: 'visitor:' }),
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
    'built-by': rawSocialBuiltBy ? parseInt(rawSocialBuiltBy, 10) : 0,
  };

  const data: AdminDashboardData = {
    activeVisitors: visitorList.keys.length,
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

  // Handle pagination for large visitor counts
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

  return jsonResponse({ activeVisitors: totalVisitors }, 200, request, env);
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

    // Route: GET /api/stats
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      return handleGetStats(request, env);
    }

    // Route: POST /api/stats
    if (url.pathname === '/api/stats' && request.method === 'POST') {
      return handlePostStats(request, env);
    }

    // Route: GET /api/stats/recent
    if (url.pathname === '/api/stats/recent' && request.method === 'GET') {
      const raw = await env.STATS.get('stats:recent');
      const recent: RecentReclaim[] = raw ? JSON.parse(raw) : [];
      return jsonResponse(recent, 200, request, env);
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

    return jsonResponse({ error: 'Not found' }, 404, request, env);
  },
};
