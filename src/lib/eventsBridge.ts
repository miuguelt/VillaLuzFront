const CHAN_NAME = 'sse-events';
const LEADER_ID_KEY = 'sse_leader_id';
const LEADER_BEAT_KEY = 'sse_leader_beat';
const STALE_TIMEOUT_MS = 5000; // 5 seconds - shorter to avoid multiple leaders
const HEARTBEAT_INTERVAL_MS = 2000; // 2 seconds

const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHAN_NAME) : null;

export function publishEvent(payload: any) {
  try { chan?.postMessage(payload); } catch { /* noop */ }
}

export function subscribeBridge(handler: (p: any) => void) {
  const onMsg = (ev: MessageEvent) => handler(ev.data);
  try { chan?.addEventListener('message', onMsg as any); } catch { /* noop */ }
  return () => {
    try { chan?.removeEventListener('message', onMsg as any); } catch { /* noop */ }
  };
}

function now() {
  return Date.now();
}

function readBeat(): number {
  try {
    const v = localStorage.getItem(LEADER_BEAT_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch { return 0; }
}

function writeBeat() {
  try { localStorage.setItem(LEADER_BEAT_KEY, String(now())); } catch { /* noop */ }
}

function readLeader(): string | null {
  try { return localStorage.getItem(LEADER_ID_KEY); } catch { return null; }
}

function writeLeader(id: string) {
  try { localStorage.setItem(LEADER_ID_KEY, id); } catch { /* noop */ }
}

function clearLeader() {
  try {
    localStorage.removeItem(LEADER_ID_KEY);
    localStorage.removeItem(LEADER_BEAT_KEY);
  } catch { /* noop */ }
}

export function claimLeadership() {
  const id = `${Math.random().toString(36).slice(2)}-${now()}`;
  const beat = readBeat();
  const stale = now() - beat > STALE_TIMEOUT_MS;
  const current = readLeader();

  if (!current || stale) {
    writeLeader(id);
    writeBeat();

    // Double-check we're still the leader after a short delay
    // This helps avoid race conditions with other tabs
    const verifyLeadership = () => {
      const actualLeader = readLeader();
      return actualLeader === id;
    };

    let timer: number | null = null;
    try {
      timer = window.setInterval(() => {
        if (verifyLeadership()) {
          writeBeat();
        } else {
          // Lost leadership, stop heartbeating
          if (timer) {
            try { clearInterval(timer); } catch { /* noop */ }
          }
        }
      }, HEARTBEAT_INTERVAL_MS);
    } catch { /* noop */ }

    const release = () => {
      try {
        if (timer) clearInterval(timer);
      } catch { /* noop */ }
      // Only clear if we're still the leader
      if (readLeader() === id) {
        clearLeader();
      }
    };

    return { isLeader: true as const, id, release };
  }

  return { isLeader: false as const, id: current, release: () => { } };
}

// Listen for storage events to detect leader changes across tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LEADER_ID_KEY || e.key === LEADER_BEAT_KEY) {
      // Leader changed, dispatch event for components to react
      window.dispatchEvent(new CustomEvent('sse-leader-changed', {
        detail: { leaderId: e.newValue }
      }));
    }
  });
}

