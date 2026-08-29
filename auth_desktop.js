// ReviseSphere Authentication, Session Management & Interactive FX Engine

const AUTH_KEY = 'rs_authenticated';
const USER_KEY = 'rs_user';

const DEFAULT_USER = {
  name: 'Amara Okeke',
  email: 'amara.okeke@stanford.edu',
  isPro: true,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
};

function getFirebaseAuth() {
  return isFirebaseConfigured() && window.firebase && typeof window.firebase.auth === 'function' ? window.firebase.auth() : null;
}

function getFirebaseDb() {
  return isFirebaseConfigured() && window.firebase && typeof window.firebase.firestore === 'function' ? window.firebase.firestore() : null;
}

function isFirebaseConfigured() {
  return Boolean(window.ReviseFirebase && window.ReviseFirebase.configured);
}

function isAuthenticated() {
  const auth = getFirebaseAuth();
  return Boolean((isFirebaseConfigured() && auth && auth.currentUser) || localStorage.getItem(AUTH_KEY) === 'true');
}

function getAuthUser() {
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

function setAuthUser(user) {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function loginUser(emailOrUsername, password, customName) {
  const auth = getFirebaseAuth();
  if (isFirebaseConfigured() && auth && emailOrUsername && emailOrUsername.includes('@')) {
    return auth.signInWithEmailAndPassword(emailOrUsername, password).then(async (credential) => {
      const userDoc = await getFirebaseDb().collection('users').doc(credential.user.uid).get();
      const user = userDoc.exists ? userDoc.data() : { ...DEFAULT_USER, email: credential.user.email, uid: credential.user.uid };
      setAuthUser(user);
      return user;
    });
  }
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

async function logoutUser() {
  const auth = getFirebaseAuth();
  if (isFirebaseConfigured() && auth) {
    await auth.signOut();
  }
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function registerUser(name, email, password) {
  const auth = getFirebaseAuth();
  if (isFirebaseConfigured() && auth) {
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    const user = { uid: credential.user.uid, name, email, isPro: false, avatar: DEFAULT_USER.avatar, createdAt: new Date().toISOString() };
    await getFirebaseDb().collection('users').doc(credential.user.uid).set(user);
    setAuthUser(user);
    return user;
  }
  return loginUser(email, password, name);
}

// Interactive Web Audio Synthesizer (Zero network dependencies)
function playSound(type) {
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
function triggerConfetti() {
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
    registerUser,
    logoutUser
  };
  window.ReviseFX = {
    playSound,
    triggerConfetti
  };
}
