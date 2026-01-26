type Handler = (data: any) => void;

const SSE_URL = '/api/v1/events';
const BASE_RETRY_DELAY_MS = 10000; // 10 seconds base delay
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes max
const RATE_LIMIT_BACKOFF_MS = 20000; // 20 seconds base backoff on 429
const MAX_RATE_LIMIT_DELAY_MS = 600000; // 10 minutes max rate limit wait
const RAPID_FAILURE_THRESHOLD_MS = 5000; // If connection fails within 5s, it's likely 429
const RAPID_FAILURE_COUNT_THRESHOLD = 5; // After 5 rapid failures, assume rate limited

const handlers = new Set<Handler>();
let source: EventSource | null = null;
let retryTimer: number | null = null;
let retryAttempt = 0;
let isRateLimited = false;
let rateLimitExpiry = 0;
let isConnecting = false;
let closeTimer: number | null = null;
let lastConnectionAttemptAt = 0;
let rapidFailureCount = 0;
let rateLimitStrikeCount = 0; // Counts consecutive rate limit hits for exponential backoff

// Persistencia del estado de rate limit para sobrevivir a reloads
const LIMIT_STORAGE_KEY = 'sse:limit_ex';
const FAIL_COUNT_KEY = 'sse:fail_count';
const STRIKE_COUNT_KEY = 'sse:strike_count';

const loadState = () => {
  if (typeof window === 'undefined') return;
  try {
    const storedExpiry = localStorage.getItem(LIMIT_STORAGE_KEY);
    if (storedExpiry) {
      const expiry = parseInt(storedExpiry, 10);
      if (expiry > Date.now()) {
        isRateLimited = true;
        rateLimitExpiry = expiry;
        console.log(`[SSE] Restored rate limit from storage. Waiting until ${new Date(expiry).toLocaleTimeString()}`);
      } else {
        localStorage.removeItem(LIMIT_STORAGE_KEY);
      }
    }

    const storedCount = localStorage.getItem(FAIL_COUNT_KEY);
    if (storedCount) {
      rapidFailureCount = parseInt(storedCount, 10);
    }

    const storedStrikes = localStorage.getItem(STRIKE_COUNT_KEY);
    if (storedStrikes) {
      rateLimitStrikeCount = parseInt(storedStrikes, 10);
    }
  } catch { /* noop */ }
};

const saveState = () => {
  if (typeof window === 'undefined') return;
  try {
    if (isRateLimited && rateLimitExpiry > Date.now()) {
      localStorage.setItem(LIMIT_STORAGE_KEY, String(rateLimitExpiry));
    } else {
      localStorage.removeItem(LIMIT_STORAGE_KEY);
    }

    if (rapidFailureCount > 0) {
      localStorage.setItem(FAIL_COUNT_KEY, String(rapidFailureCount));
    } else {
      localStorage.removeItem(FAIL_COUNT_KEY);
    }

    if (rateLimitStrikeCount > 0) {
      localStorage.setItem(STRIKE_COUNT_KEY, String(rateLimitStrikeCount));
    } else {
      localStorage.removeItem(STRIKE_COUNT_KEY);
    }
  } catch { /* noop */ }
};

// Cargar estado inicial
loadState();

const dispatchMessage = (raw: any) => {
  const payload = (() => {
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  })();

  handlers.forEach((handler) => {
    try {
      handler(payload);
    } catch {
      // Silently ignore handler errors to keep the stream alive
    }
  });
};

const closeSource = () => {
  if (!source) return;
  try {
    source.close();
  } catch {
    // No-op
  }
  source = null;
  isConnecting = false;
};

const calculateRetryDelay = (): number => {
  // Exponential backoff with jitter
  const exponentialDelay = Math.min(
    BASE_RETRY_DELAY_MS * Math.pow(2, retryAttempt),
    MAX_RETRY_DELAY_MS
  );
  const jitter = Math.floor(Math.random() * 1000);
  return exponentialDelay + jitter;
};

const scheduleReconnect = () => {
  if (retryTimer || typeof window === 'undefined') return;

  // Check if we're rate limited
  if (isRateLimited && Date.now() < rateLimitExpiry) {
    const waitMs = rateLimitExpiry - Date.now();
    console.warn(`[SSE] Rate limited, waiting ${Math.ceil(waitMs / 1000)}s before retry`);
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      isRateLimited = false;
      saveState(); // Clear stored limit
      retryAttempt = 0;
      connectSSE();
    }, waitMs);
    return;
  }

  const delay = calculateRetryDelay();
  console.log(`[SSE] Scheduling reconnect in ${Math.ceil(delay / 1000)}s (attempt ${retryAttempt + 1})`);

  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    retryAttempt++;
    connectSSE();
  }, delay);
};

let isEndpointInvalid = false;

const validateEndpoint = async () => {
  if (isEndpointInvalid) return;
  try {
    // Usar fetch para verificar si el endpoint devuelve HTML (error común detrás de proxy/SPA)
    const res = await fetch(SSE_URL, { method: 'HEAD', headers: { 'Accept': 'text/event-stream' } });

    // Detectar rate limiting explícito en la validación
    if (res.status === 429) {
      console.warn('[SSE] Endpoint returned 429 (Too Many Requests) during validation. Backing off.');
      isRateLimited = true;
      rateLimitStrikeCount++;
      // Exponential backoff: Base * 2^strikes
      const backoffMs = Math.min(
        RATE_LIMIT_BACKOFF_MS * Math.pow(2, rateLimitStrikeCount - 1),
        MAX_RATE_LIMIT_DELAY_MS
      );
      rateLimitExpiry = Date.now() + backoffMs;
      saveState();
      return;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html') || res.status === 404 || res.status === 500) {
      console.warn(`[SSE] Endpoint validation failed (Status: ${res.status}, Type: ${contentType}). Disabling SSE.`);
      isEndpointInvalid = true;
      closeSource();
    }
  } catch (e) {
    // Errores de red se manejan con reintentos normales
  }
};

const handleError = () => {
  closeSource();
  // Verificar endpoint si hay fallos rápidos, podría ser una ruta inválida
  // Evitar probar el endpoint si ya sabemos que estamos limitados por tasa (429)
  if (rapidFailureCount > 0 && !isRateLimited) {
    void validateEndpoint();
  }
  scheduleReconnect();
};

const createEventSource = () => {
  if (typeof window === 'undefined') return null;

  // Reload state just in case
  loadState();

  if (isEndpointInvalid) {
    console.debug('[SSE] Endpoint marked as invalid, skipping connection');
    return null;
  }

  if (isConnecting) return source;

  // Don't attempt connection if rate limited
  if (isRateLimited && Date.now() < rateLimitExpiry) {
    const waitMs = rateLimitExpiry - Date.now();
    console.warn(`[SSE] Rate limited, not connecting. Wait ${Math.ceil(waitMs / 1000)}s`);
    scheduleReconnect();
    return null;
  }

  isConnecting = true;
  const connectionStartedAt = Date.now();
  lastConnectionAttemptAt = connectionStartedAt;

  try {
    const es = new EventSource(SSE_URL, { withCredentials: true } as any);
    source = es;

    es.onopen = () => {
      console.log('[SSE] Connection established');
      retryAttempt = 0; // Reset on successful connection
      rapidFailureCount = 0; // Reset rapid failure counter
      rateLimitStrikeCount = 0; // Reset rate limit strikes
      isRateLimited = false;
      saveState(); // Clear storage
      isConnecting = false;
    };

    es.onmessage = (event: MessageEvent) => dispatchMessage(event.data);

    es.onerror = () => {
      isConnecting = false;
      const timeSinceStart = Date.now() - connectionStartedAt;

      // Detect rapid failures (connection failed very quickly after opening)
      // This is a strong indicator of 429 or other server-side rejection
      if (timeSinceStart < RAPID_FAILURE_THRESHOLD_MS) {
        rapidFailureCount++;
        saveState(); // Save count increment
        console.warn(`[SSE] Rapid failure detected (${timeSinceStart}ms). Count: ${rapidFailureCount}`);

        if (rapidFailureCount >= RAPID_FAILURE_COUNT_THRESHOLD) {
          // Assume rate limited after consecutive rapid failures
          isRateLimited = true;
          rateLimitStrikeCount++;

          const backoffMs = Math.min(
            RATE_LIMIT_BACKOFF_MS * Math.pow(2, rateLimitStrikeCount - 1),
            MAX_RATE_LIMIT_DELAY_MS
          );

          rateLimitExpiry = Date.now() + backoffMs;
          rapidFailureCount = 0; // Reset counter
          saveState(); // Save rate limit state
          console.warn(`[SSE] Assuming rate limit after ${RAPID_FAILURE_COUNT_THRESHOLD} rapid failures. Backing off until ${new Date(rateLimitExpiry).toLocaleTimeString()}`);
        }
      } else {
        // Not a rapid failure, reset counter
        if (rapidFailureCount > 0) {
          rapidFailureCount = 0;
          saveState();
        }
      }

      // Also check for explicit rate-limit event from API client
      const recentRateLimitEvent = (window as any).__lastSSERateLimitAt;
      if (recentRateLimitEvent && Date.now() - recentRateLimitEvent < 5000) {
        isRateLimited = true;
        rateLimitStrikeCount++;
        if (!rateLimitExpiry || rateLimitExpiry < Date.now()) {
          const backoffMs = Math.min(
            RATE_LIMIT_BACKOFF_MS * Math.pow(2, rateLimitStrikeCount - 1),
            MAX_RATE_LIMIT_DELAY_MS
          );
          rateLimitExpiry = Date.now() + backoffMs;
        }
        saveState();
        console.warn(`[SSE] Rate limit event detected, backing off until ${new Date(rateLimitExpiry).toLocaleTimeString()}`);
      }

      handleError();
    };

    return es;
  } catch (err) {
    isConnecting = false;
    console.error('[SSE] Failed to create EventSource:', err);
    scheduleReconnect();
    return null;
  }
};

// Listen for rate limit events from the API client
if (typeof window !== 'undefined') {
  window.addEventListener('rate-limit-exceeded', ((e: CustomEvent) => {
    const detail = e.detail || {};
    if (detail.endpoint?.includes('events')) {
      (window as any).__lastSSERateLimitAt = Date.now();
      isRateLimited = true;
      const waitSeconds = typeof detail.waitSeconds === 'number' ? detail.waitSeconds : 60;
      rateLimitExpiry = Date.now() + waitSeconds * 1000;

      saveState();

      // Close current connection and schedule reconnect after rate limit expires
      closeSource();
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      scheduleReconnect();
    }
  }) as EventListener);
}

/**
 * Abre la conexión SSE si aún no existe.
 */
export function connectSSE(): EventSource | null {
  if (typeof window === 'undefined') return null;

  // Cancel pending close if any (reusing connection across re-mounts)
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  if (source && source.readyState !== EventSource.CLOSED) return source;
  return createEventSource();
}

/**
 * Cierra la conexión SSE activa y cancela reintentos pendientes.
 */
export function closeSSE(immediate = false) {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  // Clear retry timer immediately to prevent resurrection if we are truly closing
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  if (immediate) {
    closeSource();
    retryAttempt = 0;
  } else {
    // Grace period: Wait 2s before actually closing.
    // If the component re-mounts (e.g. Strict Mode), connectSSE will cancel this.
    closeTimer = window.setTimeout(() => {
      closeTimer = null;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      closeSource();
      retryAttempt = 0;
    }, 2000);
  }
}

/**
 * Se suscribe a los eventos del servidor y asegura que exista la conexión SSE.
 */
export function subscribeSSE(handler: Handler) {
  handlers.add(handler);
  connectSSE();
  return () => {
    handlers.delete(handler);
  };
}

/**
 * Returns the current connection status
 */
export function getSSEStatus() {
  return {
    connected: source?.readyState === EventSource.OPEN,
    connecting: isConnecting || source?.readyState === EventSource.CONNECTING,
    rateLimited: isRateLimited,
    rateLimitExpiry,
    retryAttempt,
    rapidFailureCount,
  };
}

const sse = {
  subscribe: subscribeSSE,
  connect: connectSSE,
  close: closeSSE,
  getStatus: getSSEStatus,
};

export default sse;
