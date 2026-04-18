/* ═══════════════════════════════════════════════════════════════════
   LazyPO — Focus FM  |  Spotify Integration
   ───────────────────────────────────────────────────────────────────
   SETUP (one-time, ~3 min)
   ───────────────────────────────────────────────────────────────────
   1. Go to https://developer.spotify.com/dashboard → Create app
   2. App name: "LazyPO Focus FM"  |  Redirect URI (exact):
         https://ndashiz.be/lazypo/spotify-callback.html
   3. Copy the Client ID and paste it below (CLIENT_ID)
   4. Same Client ID must be in spotify-callback.html
   ─────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────────── */
  const CLIENT_ID    = 'YOUR_SPOTIFY_CLIENT_ID';   // ← paste here
  const REDIRECT_URI = 'https://ndashiz.be/lazypo/spotify-callback.html';
  const SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read',
  ].join(' ');

  /* ── Storage keys ───────────────────────────────────────────────── */
  const K_ACCESS  = 'fm_access_token';
  const K_REFRESH = 'fm_refresh_token';
  const K_EXPIRY  = 'fm_token_expiry';
  const K_VOL     = 'fm_volume';

  /* ── State ──────────────────────────────────────────────────────── */
  let player        = null;
  let deviceId      = null;
  let isPaused      = true;
  let currentTrack  = null;
  let progressMs    = 0;
  let durationMs    = 1;
  let progressTimer = null;

  /* ══════════════════════════════════════════════════════════════════
     TOKEN MANAGEMENT
  ══════════════════════════════════════════════════════════════════ */

  function saveTokens({ access_token, refresh_token, expires_in }) {
    localStorage.setItem(K_ACCESS, access_token);
    if (refresh_token) localStorage.setItem(K_REFRESH, refresh_token);
    localStorage.setItem(K_EXPIRY, Date.now() + expires_in * 1000);
  }

  const getAccessToken  = () => localStorage.getItem(K_ACCESS);
  const getRefreshToken = () => localStorage.getItem(K_REFRESH);
  const isTokenExpired  = () => Date.now() > (parseInt(localStorage.getItem(K_EXPIRY) || '0') - 60000);

  async function refreshTokens() {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: rt,
          client_id: CLIENT_ID,
        }),
      });
      if (!res.ok) { clearTokens(); return false; }
      saveTokens(await res.json());
      return true;
    } catch { return false; }
  }

  function clearTokens() {
    [K_ACCESS, K_REFRESH, K_EXPIRY].forEach(k => localStorage.removeItem(k));
  }

  async function ensureValidToken() {
    if (!getAccessToken()) return false;
    if (isTokenExpired()) return refreshTokens();
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════
     SPOTIFY API HELPER
  ══════════════════════════════════════════════════════════════════ */

  async function spotifyFetch(path, opts = {}) {
    if (!await ensureValidToken()) return null;
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    if (res.status === 204) return {};
    if (!res.ok) return null;
    return res.json().catch(() => ({}));
  }

  /* ══════════════════════════════════════════════════════════════════
     PKCE OAUTH
  ══════════════════════════════════════════════════════════════════ */

  function randomBase64url(byteLen = 32) {
    const arr = new Uint8Array(byteLen);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async function sha256b64url(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async function startOAuth() {
    if (CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID') {
      alert('⚠️ Focus FM: please set your Spotify Client ID in focusfm.js first.\n\nGo to developer.spotify.com → create an app → copy the Client ID.');
      return;
    }
    const verifier  = randomBase64url(64);
    const challenge = await sha256b64url(verifier);
    const state     = randomBase64url(16);
    localStorage.setItem('fm_pkce_verifier', verifier);
    localStorage.setItem('fm_pkce_state', state);
    localStorage.setItem('fm_return_url', location.href);

    location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: SCOPES,
      state,
    });
  }

  function disconnect() {
    if (player) { try { player.disconnect(); } catch (_) {} player = null; }
    clearTokens();
    deviceId = null; isPaused = true; currentTrack = null;
    clearInterval(progressTimer);
    renderPlayerUI();
  }

  /* ══════════════════════════════════════════════════════════════════
     WEB PLAYBACK SDK
  ══════════════════════════════════════════════════════════════════ */

  function initSDK() {
    const doInit = () => {
      player = new Spotify.Player({
        name: 'LazyPO Focus FM',
        getOAuthToken: async cb => {
          await ensureValidToken();
          cb(getAccessToken());
        },
        volume: parseFloat(localStorage.getItem(K_VOL) || '0.7'),
      });

      player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        // Transfer playback to this browser device (don't auto-start)
        spotifyFetch('/me/player', {
          method: 'PUT',
          body: JSON.stringify({ device_ids: [device_id], play: false }),
        });
      });

      player.addListener('player_state_changed', state => {
        if (!state) return;
        isPaused     = state.paused;
        currentTrack = state.track_window?.current_track || null;
        progressMs   = state.position;
        durationMs   = state.duration || 1;
        updatePlayerUI();
        startProgressTick();
      });

      player.addListener('authentication_error', () => {
        clearTokens(); renderPlayerUI();
      });
      player.addListener('account_error', ({ message }) => {
        showFmToast('Spotify Premium required for in-browser playback. ' + message);
      });
      player.addListener('initialization_error', ({ message }) => {
        console.warn('[FocusFM] SDK init error:', message);
      });

      player.connect();
    };

    // If SDK already loaded, init immediately
    if (window.Spotify?.Player) { doInit(); return; }

    // Set ready callback before loading script
    const prev = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (prev) prev();
      doInit();
    };

    if (!document.querySelector('script[src*="spotify-player"]')) {
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      document.head.appendChild(s);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     PLAYBACK CONTROLS
  ══════════════════════════════════════════════════════════════════ */

  const togglePlay = () => player?.togglePlay();
  const nextTrack  = () => player?.nextTrack();
  const prevTrack  = () => player?.previousTrack();

  async function setVolume(v) {
    await player?.setVolume(v);
    localStorage.setItem(K_VOL, v);
  }

  function seekTo(ratio) {
    player?.seek(Math.floor(ratio * durationMs));
  }

  /* ══════════════════════════════════════════════════════════════════
     PROGRESS TICKER
  ══════════════════════════════════════════════════════════════════ */

  function startProgressTick() {
    clearInterval(progressTimer);
    if (isPaused) return;
    progressTimer = setInterval(() => {
      progressMs = Math.min(progressMs + 500, durationMs);
      updateProgress();
    }, 500);
  }

  function fmtMs(ms) {
    const s = Math.floor((ms || 0) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /* ══════════════════════════════════════════════════════════════════
     CSS INJECTION
  ══════════════════════════════════════════════════════════════════ */

  function injectCSS() {
    if (document.getElementById('_fm_css')) return;
    const style = document.createElement('style');
    style.id = '_fm_css';
    style.textContent = `
/* ─────────────── Focus FM — bottom player bar ─────────────── */
#_fm_bar_wrap {
  position: fixed;
  bottom: 0; left: 64px; right: 0;
  height: 72px;
  background: #111;
  border-top: 1px solid #1e1e1e;
  display: flex; align-items: center;
  gap: 0;
  z-index: 199;
  font-family: 'DM Sans', sans-serif;
  transition: opacity 0.25s, transform 0.25s;
}
#_fm_bar_wrap.fm-gone { transform: translateY(100%); opacity: 0; pointer-events: none; }

/* Section sizing */
.fm-section-left   { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; padding: 0 20px; }
.fm-section-center { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1.4; padding: 0 20px; }
.fm-section-right  { display: flex; align-items: center; gap: 10px; flex: 1; justify-content: flex-end; padding: 0 20px; }

/* Album art */
.fm-art {
  width: 44px; height: 44px; border-radius: 5px;
  object-fit: cover; flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}
.fm-art-ph {
  width: 44px; height: 44px; border-radius: 5px; flex-shrink: 0;
  background: linear-gradient(135deg, #1db954 0%, #0f5c2a 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}

/* Track info */
.fm-track-name {
  font-size: 13px; font-weight: 600; color: #f0f0f0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 180px;
}
.fm-track-artist {
  font-size: 11px; color: #6b6b6b; margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 180px;
}

/* Controls */
.fm-ctrl { display: flex; align-items: center; gap: 4px; }
.fm-btn {
  background: none; border: none; color: #a0a0a0;
  cursor: pointer; border-radius: 50%;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.fm-btn:hover { color: #fff; background: rgba(255,255,255,0.07); }
.fm-btn-play {
  width: 36px; height: 36px; border-radius: 50%;
  background: #fff; color: #000;
  transition: transform 0.15s, background 0.15s;
}
.fm-btn-play:hover { background: #e8e8e8; transform: scale(1.06); }

/* Progress row */
.fm-prog-row { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 480px; }
.fm-time { font-size: 10px; color: #555; font-family: 'DM Mono', monospace; flex-shrink: 0; width: 32px; }
.fm-time-r { text-align: right; }
.fm-prog-track {
  flex: 1; height: 4px; background: #2a2a2a;
  border-radius: 2px; cursor: pointer; position: relative;
}
.fm-prog-fill {
  height: 100%; background: #fff; border-radius: 2px;
  pointer-events: none;
  transition: width 0.4s linear;
}
.fm-prog-track:hover .fm-prog-fill { background: #1db954; }
.fm-prog-track::after {
  content: ''; position: absolute;
  top: -6px; bottom: -6px; left: 0; right: 0;
}

/* Volume */
.fm-vol-row { display: flex; align-items: center; gap: 8px; }
.fm-vol-ico { font-size: 14px; color: #6b6b6b; cursor: default; user-select: none; }
input.fm-vol-input {
  -webkit-appearance: none; appearance: none;
  width: 80px; height: 4px; border-radius: 2px;
  background: #2a2a2a; outline: none; cursor: pointer;
}
input.fm-vol-input::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 12px; height: 12px; border-radius: 50%;
  background: #fff; cursor: pointer;
}
input.fm-vol-input:hover { background: #3a3a3a; }

/* Disconnect */
.fm-disc-btn {
  background: none; border: 1px solid #2a2a2a; color: #444;
  border-radius: 5px; padding: 4px 9px; font-size: 11px;
  cursor: pointer; white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.fm-disc-btn:hover { border-color: #f87171; color: #f87171; }

/* Connect state */
.fm-connect-area { display: flex; align-items: center; gap: 16px; padding: 0 24px; width: 100%; }
.fm-connect-label { font-size: 14px; color: #6b6b6b; }
.fm-connect-label strong { color: #f0f0f0; }
.fm-connect-btn {
  display: flex; align-items: center; gap: 8px;
  background: #1db954; color: #000; border: none;
  border-radius: 20px; padding: 9px 20px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
  flex-shrink: 0;
}
.fm-connect-btn:hover { background: #1ed760; transform: scale(1.03); }

/* Toast */
#_fm_toast {
  position: fixed; bottom: 84px; left: 50%; transform: translateX(-50%) translateY(8px);
  background: #222; border: 1px solid #333; color: #f0f0f0;
  padding: 8px 16px; border-radius: 8px; font-size: 13px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
  z-index: 500; white-space: nowrap; max-width: 90vw;
  font-family: 'DM Sans', sans-serif;
}
#_fm_toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* Push body content up so nothing hides behind player */
body { padding-bottom: 72px !important; }

/* Mobile: player spans full width */
@media (max-width: 768px) {
  #_fm_bar_wrap { left: 0; }
  .fm-section-left { padding: 0 12px; }
  .fm-section-center { padding: 0 8px; }
  .fm-section-right { display: none; }
}
    `;
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════════════════════════════ */

  function showFmToast(msg, ms = 3000) {
    let t = document.getElementById('_fm_toast');
    if (!t) {
      t = document.createElement('div');
      t.id = '_fm_toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ══════════════════════════════════════════════════════════════════
     UI — FULL RENDER
  ══════════════════════════════════════════════════════════════════ */

  const WRAP_ID = '_fm_bar_wrap';

  function getOrCreateWrap() {
    let w = document.getElementById(WRAP_ID);
    if (!w) {
      w = document.createElement('div');
      w.id = WRAP_ID;
      document.body.appendChild(w);
    }
    return w;
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderPlayerUI() {
    const wrap = getOrCreateWrap();
    const hasToken = !!getAccessToken();

    /* ── Not connected ── */
    if (!hasToken) {
      wrap.innerHTML = `
        <div class="fm-connect-area">
          <div class="fm-art-ph">🎵</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:#f0f0f0">Focus FM</div>
            <div class="fm-connect-label" style="margin-top:2px">Your <strong>Spotify</strong> soundtrack — always on, wherever you work</div>
          </div>
          <button class="fm-connect-btn" id="_fm_oauth_btn">
            <svg width="15" height="15" viewBox="0 0 168 168" fill="currentColor">
              <path d="M84 0C37.6 0 0 37.6 0 84s37.6 84 84 84 84-37.6 84-84S130.4 0 84 0zm38.5 121.2c-1.6 2.6-5 3.4-7.6 1.8C94.1 110.3 67.9 107.4 37.1 114.5c-3 .7-5.9-1.1-6.6-4.1-.7-3 1.1-5.9 4.1-6.6 33.7-7.7 62.7-4.4 86.1 9.8 2.6 1.6 3.4 5 1.8 7.6zm10.3-22.8c-2 3.2-6.2 4.2-9.4 2.2C99.6 85.9 63.4 81.6 35.3 90.2c-3.5 1-7.1-1-8.1-4.4-1-3.5 1-7.1 4.4-8.1 32.1-9.8 72-5 99.1 11.7 3.2 2 4.2 6.2 2.1 9zm.9-23.7C108.9 57.8 62 56.3 34.2 64.3c-4.1 1.2-8.5-1.1-9.8-5.3-1.2-4.1 1.1-8.5 5.3-9.8C60 40.4 111 42.1 138.6 58c3.8 2.2 5.1 7 2.9 10.7-.2.3-.5.6-.8 1z"/>
            </svg>
            Connect Spotify
          </button>
        </div>`;
      document.getElementById('_fm_oauth_btn')?.addEventListener('click', startOAuth);
      return;
    }

    /* ── Connected ── */
    const art        = currentTrack?.album?.images?.[0]?.url;
    const trackName  = currentTrack?.name || '—';
    const artistName = currentTrack?.artists?.map(a => a.name).join(', ') || '—';
    const pct        = durationMs > 0 ? (progressMs / durationMs * 100).toFixed(2) : 0;
    const vol        = parseFloat(localStorage.getItem(K_VOL) || '0.7');

    wrap.innerHTML = `
      <!-- Left: art + track info -->
      <div class="fm-section-left">
        ${art
          ? `<img class="fm-art" src="${esc(art)}" alt="">`
          : `<div class="fm-art-ph">🎵</div>`}
        <div style="min-width:0">
          <div class="fm-track-name" title="${esc(trackName)}">${esc(trackName)}</div>
          <div class="fm-track-artist">${esc(artistName)}</div>
        </div>
      </div>

      <!-- Center: controls + progress -->
      <div class="fm-section-center">
        <div class="fm-ctrl">
          <button class="fm-btn" id="_fm_prev" title="Previous">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </button>
          <button class="fm-btn fm-btn-play" id="_fm_play" title="${isPaused ? 'Play' : 'Pause'}">
            ${isPaused
              ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
              : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
            }
          </button>
          <button class="fm-btn" id="_fm_next" title="Next">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m6 18 8.5-6L6 6v12zm2-6zm8.5-6H18v12h-1.5z"/></svg>
          </button>
        </div>
        <div class="fm-prog-row">
          <span class="fm-time" id="_fm_pos_lbl">${fmtMs(progressMs)}</span>
          <div class="fm-prog-track" id="_fm_prog">
            <div class="fm-prog-fill" id="_fm_fill" style="width:${pct}%"></div>
          </div>
          <span class="fm-time fm-time-r">${fmtMs(durationMs)}</span>
        </div>
      </div>

      <!-- Right: volume + disconnect -->
      <div class="fm-section-right">
        <div class="fm-vol-row">
          <span class="fm-vol-ico">${vol < 0.05 ? '🔇' : vol < 0.5 ? '🔉' : '🔊'}</span>
          <input type="range" class="fm-vol-input" id="_fm_vol"
            min="0" max="1" step="0.02" value="${vol}">
        </div>
        <button class="fm-disc-btn" id="_fm_disc" title="Disconnect Spotify">Disconnect</button>
      </div>`;

    /* Wire controls */
    document.getElementById('_fm_prev')?.addEventListener('click', prevTrack);
    document.getElementById('_fm_play')?.addEventListener('click', togglePlay);
    document.getElementById('_fm_next')?.addEventListener('click', nextTrack);

    document.getElementById('_fm_disc')?.addEventListener('click', () => {
      if (confirm('Disconnect your Spotify account from LazyPO?')) disconnect();
    });

    document.getElementById('_fm_vol')?.addEventListener('input', e => {
      setVolume(parseFloat(e.target.value));
      // Update icon live
      const ico = e.target.closest('.fm-vol-row')?.querySelector('.fm-vol-ico');
      if (ico) {
        const v = parseFloat(e.target.value);
        ico.textContent = v < 0.05 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
      }
    });

    document.getElementById('_fm_prog')?.addEventListener('click', e => {
      const rect = e.currentTarget.getBoundingClientRect();
      seekTo((e.clientX - rect.left) / rect.width);
    });
  }

  /* ── Lightweight state update (no full re-render) ── */
  function updatePlayerUI() {
    // Play button icon
    const playBtn = document.getElementById('_fm_play');
    if (playBtn) {
      playBtn.title = isPaused ? 'Play' : 'Pause';
      playBtn.innerHTML = isPaused
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    }

    // If track changed, full re-render
    const nameEl = document.querySelector('.fm-track-name');
    if (!nameEl || nameEl.getAttribute('title') !== (currentTrack?.name || '—')) {
      renderPlayerUI();
      return;
    }

    updateProgress();
  }

  function updateProgress() {
    const fill = document.getElementById('_fm_fill');
    const pos  = document.getElementById('_fm_pos_lbl');
    if (fill) fill.style.width = durationMs > 0 ? (progressMs / durationMs * 100).toFixed(2) + '%' : '0%';
    if (pos)  pos.textContent  = fmtMs(progressMs);
  }

  /* ══════════════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════════════ */

  function boot() {
    // Skip on login and callback pages
    const page = location.pathname.split('/').pop().toLowerCase();
    if (page === 'login.html' || page === 'spotify-callback.html') return;

    injectCSS();
    renderPlayerUI();

    if (getAccessToken()) {
      ensureValidToken().then(ok => {
        if (ok) initSDK();
        else { clearTokens(); renderPlayerUI(); }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ── Public API (used by spotify-callback.html) ── */
  window.FocusFM = { saveTokens, CLIENT_ID, REDIRECT_URI };
})();
