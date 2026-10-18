// Talks to start.ng through its hidden connect page (see https://start.ng/docs.md).
const START_NG = 'https://start.ng';

// The connect page only answers games served from *.start.ng.
const ON_START_NG = location.hostname.endsWith('.start.ng');

let frame;

function connectFrame() {
  frame ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return frame;
}

// Sends a message and resolves to start.ng's reply, or null if it didn't answer.
async function askStartNg(message, replyType, timeoutMs = 5000) {
  if (!ON_START_NG) return null;
  // Give up if the connect page itself is slow to load, not only if it is slow to answer.
  const gaveUp = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const el = await Promise.race([connectFrame(), gaveUp]);
  if (!el) return null;
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => {
      clearTimeout(timer);
      removeEventListener('message', onMessage);
      resolve(reply);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return;
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }
    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

// { user, guest } from start.ng, or null when start.ng can't be reached.
export async function whoIsPlaying() {
  try {
    const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
    if (!reply) return null;
    return { user: reply.user ?? null, guest: reply.guest ?? null };
  } catch {
    return null;
  }
}

export function signIn() {
  location.href = `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

// Saves a finished round. Resolves to start.ng's reply, or null when start.ng can't be reached.
export async function saveRun(gems) {
  try {
    return await askStartNg({ type: 'startng:score', stats: { gems } }, 'startng:scoreSaved');
  } catch {
    return null;
  }
}

// The top players, or null when start.ng can't be reached.
export async function topPlayers(limit = 10) {
  try {
    const reply = await askStartNg({ type: 'startng:leaderboard', limit }, 'startng:leaderboardData');
    return reply?.ok ? reply.entries : null;
  } catch {
    return null;
  }
}
