// ReviseSphere Authentication, Session Management & Interactive FX Engine

const AUTH_KEY = 'rs_authenticated';
const USER_KEY = 'rs_user';

const DEFAULT_USER = {
  name: 'Amara Okeke',
  email: 'amara.okeke@stanford.edu',
  isPro: true,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
};

export function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function getAuthUser() {
  const stored = localStorage.getItem(USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_USER;
    }
  }
  return DEFAULT_USER;
}

export function setAuthUser(user) {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loginUser(emailOrUsername, password, customName) {
  let name = customName;
  if (!name) {
    if (emailOrUsername && emailOrUsername.includes('@')) {
      const parts = emailOrUsername.split('@')[0].split('.');
      name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    } else if (emailOrUsername) {
      name = emailOrUsername.charAt(0).toUpperCase() + emailOrUsername.slice(1);
    } else {
      name = 'Student';
    }
  }

  const email = (emailOrUsername && emailOrUsername.includes('@')) 
    ? emailOrUsername 
    : `${(emailOrUsername || 'user').toLowerCase()}@stanford.edu`;

  const user = {
    ...DEFAULT_USER,
    name: name,
    email: email
  };

  setAuthUser(user);
  playSound('celebrate');
  triggerConfetti();
  return user;
}

export function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

// Interactive Web Audio Synthesizer (Zero network dependencies)
export function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'flip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success' || type === 'celebrate') {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
      });
    }
  } catch (e) {
    // Silently ignore browser autoplay policies prior to user gesture
  }
}

// Particle & Confetti Explosion Trigger
export function triggerConfetti() {
  if (typeof window.confetti === 'function') {
    window.confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
  }
}

// Window global bindings for non-module scripts
if (typeof window !== 'undefined') {
  window.ReviseAuth = {
    isAuthenticated,
    getAuthUser,
    setAuthUser,
    loginUser,
    logoutUser
  };
  window.ReviseFX = {
    playSound,
    triggerConfetti
  };
}
