/* ═══════════════════════════════════════════════════════════════════
   LazyPO — auth.js  |  Shared authentication + user widget module
   ───────────────────────────────────────────────────────────────────
   SUPABASE SETUP  (run once in Supabase SQL Editor)
   ───────────────────────────────────────────────────────────────────

   -- 1. Profiles table
   create table public.profiles (
     id          uuid references auth.users(id) on delete cascade primary key,
     username    text,
     avatar_url  text,
     is_admin    boolean default false,
     created_at  timestamptz default now()
   );
   alter table public.profiles enable row level security;
   create policy "own_profile" on public.profiles
     using (auth.uid() = id) with check (auth.uid() = id);

   -- 2. Storage bucket  (Dashboard → Storage → New bucket)
   --    Name: avatars   |  Public: ON
   --    Then add these policies in SQL Editor:
   create policy "avatars_public_read" on storage.objects
     for select using (bucket_id = 'avatars');
   create policy "avatars_upload" on storage.objects
     for insert with check (
       bucket_id = 'avatars' and
       auth.uid()::text = (storage.foldername(name))[1]
     );
   create policy "avatars_update" on storage.objects
     for update using (
       bucket_id = 'avatars' and
       auth.uid()::text = (storage.foldername(name))[1]
     );
   create policy "avatars_delete" on storage.objects
     for delete using (
       bucket_id = 'avatars' and
       auth.uid()::text = (storage.foldername(name))[1]
     );
═══════════════════════════════════════════════════════════════════ */

(function () {
  /* ── Config ──────────────────────────────────────────────────── */
  const SUPABASE_URL  = 'https://hrvxhnmtvzvrsmmmmtsv.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_Mj-FuPZcN_oTeLQ0ME84yQ_uulPdJ4c';
  const LOGIN_PAGE    = 'login.html';
  const ACCOUNT_PAGE  = 'account.html';

  const { createClient } = supabase;
  window.sb = createClient(SUPABASE_URL, SUPABASE_ANON);

  /* ── Inject widget CSS once ──────────────────────────────────── */
  const css = document.createElement('style');
  css.textContent = `
  /* ─────────────────────── user widget ─────────────────────── */
  .sidebar-footer { padding: 0 4px; }

  .user-widget { position: relative; width: 100%; }

  .user-trigger {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 8px 10px;
    background: transparent; border: 1px solid transparent;
    border-radius: 10px; cursor: pointer; color: var(--text);
    transition: background 0.15s, border-color 0.15s; text-align: left;
    font-family: 'DM Sans', sans-serif;
  }
  .user-trigger:hover { background: var(--surface2); border-color: var(--border2); }

  .u-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden; position: relative;
    box-shadow: 0 0 0 2px rgba(96,165,250,0.2);
  }
  .u-avatar img {
    width: 100%; height: 100%; object-fit: cover;
    position: absolute; inset: 0;
  }
  .u-avatar-fallback {
    font-size: 13px; font-weight: 700; color: #fff;
    font-family: 'DM Sans', sans-serif; line-height: 1;
    position: relative; z-index: 1;
  }

  .u-info { flex: 1; min-width: 0; }
  .u-name {
    display: flex; align-items: center; gap: 5px;
    font-size: 13px; font-weight: 600; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.3;
  }
  .u-email {
    font-size: 11px; color: var(--muted); display: block;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.3;
  }

  .badge-admin {
    font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
    padding: 2px 6px; border-radius: 20px; text-transform: uppercase;
    background: rgba(139,92,246,0.15); color: #c084fc;
    border: 1px solid rgba(192,132,252,0.25); flex-shrink: 0;
  }

  .u-chevron {
    flex-shrink: 0; color: var(--muted);
    transition: transform 0.2s ease;
  }
  .user-widget.open .u-chevron { transform: rotate(180deg); }

  /* ─── dropdown ─── */
  .u-menu {
    position: absolute; bottom: calc(100% + 6px); left: 0; right: 0;
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 10px; padding: 4px;
    box-shadow: 0 -8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03);
    opacity: 0; pointer-events: none;
    transform: translateY(6px); transition: opacity 0.15s, transform 0.15s;
    z-index: 300;
  }
  .u-menu.open { opacity: 1; pointer-events: all; transform: translateY(0); }

  .u-menu-item {
    display: flex; align-items: center; gap: 9px;
    width: 100%; padding: 9px 12px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    color: var(--text); background: transparent; border: none;
    border-radius: 8px; cursor: pointer; text-decoration: none;
    transition: background 0.12s; white-space: nowrap;
  }
  .u-menu-item:hover { background: rgba(255,255,255,0.05); }
  .u-menu-item.danger { color: #f87171; }
  .u-menu-item.danger:hover { background: rgba(239,68,68,0.1); }
  .u-menu-sep { height: 1px; background: var(--border); margin: 4px 2px; }

  /* ─── guest btn ─── */
  .auth-guest-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 10px 12px;
    background: var(--accent); color: #fff; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    text-decoration: none; transition: background 0.15s, transform 0.15s;
    border: none; cursor: pointer;
  }
  .auth-guest-btn:hover { background: #2563eb; transform: translateY(-1px); }
  `;
  document.head.appendChild(css);

  /* ── Boot ────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    await renderNavUser();
    window.sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.href = LOGIN_PAGE;
      if (event === 'SIGNED_IN')  renderNavUser();
    });
  }

  /* ── Render sidebar footer ───────────────────────────────────── */
  async function renderNavUser() {
    const footer = document.querySelector('.sb-footer');
    if (!footer) return;

    const { data: { session } } = await window.sb.auth.getSession();

    if (!session) {
      footer.innerHTML = `
        <a href="${LOGIN_PAGE}" class="auth-guest-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Sign in
        </a>`;
      return;
    }

    /* fetch profile — graceful if table doesn't exist yet */
    let profile = null;
    try {
      const { data } = await window.sb
        .from('profiles').select('*').eq('id', session.user.id).single();
      profile = data;
    } catch (_) {}

    const email    = session.user.email || '';
    const username = profile?.username || email.split('@')[0] || 'User';
    const avatar   = profile?.avatar_url || null;
    const isAdmin  = profile?.is_admin || false;
    const initial  = username[0].toUpperCase();

    footer.innerHTML = `
      <div class="user-widget" id="authWidget">
        <button class="user-trigger" onclick="window.__authToggleMenu(event)">
          <div class="u-avatar">
            ${avatar ? `<img src="${esc(avatar)}" alt="" onerror="this.remove()">` : ''}
            <div class="u-avatar-fallback">${esc(initial)}</div>
          </div>
          <div class="u-info">
            <span class="u-name">
              ${esc(username)}
              ${isAdmin ? '<span class="badge-admin">Admin</span>' : ''}
            </span>
            <span class="u-email">${esc(email)}</span>
          </div>
          <svg class="u-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div class="u-menu" id="authMenu">
          <a href="${ACCOUNT_PAGE}" class="u-menu-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            My Account
          </a>
          <div class="u-menu-sep"></div>
          <button class="u-menu-item danger" onclick="window.__authSignOut()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>`;

    /* close on outside click */
    setTimeout(() => {
      document.addEventListener('click', _closeOnOutside, { capture: true });
    }, 0);
  }

  function _closeOnOutside(e) {
    const w = document.getElementById('authWidget');
    if (w && !w.contains(e.target)) _closeMenu();
  }

  function _closeMenu() {
    document.getElementById('authMenu')?.classList.remove('open');
    document.getElementById('authWidget')?.classList.remove('open');
  }

  /* ── Global handlers ─────────────────────────────────────────── */
  window.__authToggleMenu = function (e) {
    e.stopPropagation();
    const menu   = document.getElementById('authMenu');
    const widget = document.getElementById('authWidget');
    if (!menu) return;
    const opening = !menu.classList.contains('open');
    menu.classList.toggle('open', opening);
    widget?.classList.toggle('open', opening);
  };

  window.__authSignOut = async function () {
    await window.sb.auth.signOut();
    window.location.href = LOGIN_PAGE;
  };

  /* ── Public API ──────────────────────────────────────────────── */
  window.LazyAuth = {
    /** Redirect to login if no session, else return session */
    requireAuth: async () => {
      const { data: { session } } = await window.sb.auth.getSession();
      if (!session) { window.location.href = LOGIN_PAGE; return null; }
      return session;
    },
    /** Fetch a user's profile row */
    getProfile: async (userId) => {
      const { data } = await window.sb.from('profiles').select('*').eq('id', userId).single();
      return data;
    },
    /** Upsert profile fields */
    saveProfile: async (userId, fields) => {
      return window.sb.from('profiles').upsert({ id: userId, ...fields });
    },
    /** Upload avatar and return public URL */
    uploadAvatar: async (userId, file) => {
      const ext  = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error } = await window.sb.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = window.sb.storage.from('avatars').getPublicUrl(path);
      return data.publicUrl;
    },
  };

  /* ── Auth guard popup ───────────────────────────────────────── */
  function _injectPopupStyles() {
    if (document.getElementById('__authPopupStyles')) return;
    const s = document.createElement('style');
    s.id = '__authPopupStyles';
    s.textContent = `
    #authGuardOverlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      animation: __fadeIn 0.2s ease;
    }
    @keyframes __fadeIn { from { opacity: 0; } to { opacity: 1; } }

    #authGuardCard {
      background: #161616; border: 1px solid #2a2a2a;
      border-radius: 18px; padding: 36px 32px;
      max-width: 400px; width: 100%;
      text-align: center;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      animation: __slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes __slideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }

    #authGuardCard .ag-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: rgba(59,130,246,0.12); border: 1px solid rgba(96,165,250,0.2);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px; font-size: 22px;
    }
    #authGuardCard h2 {
      font-family: 'DM Sans', sans-serif; font-size: 18px; font-weight: 700;
      color: #f0f0f0; margin-bottom: 10px;
    }
    #authGuardCard p {
      font-family: 'DM Sans', sans-serif; font-size: 14px; color: #6b6b6b;
      line-height: 1.6; margin-bottom: 28px;
    }
    #authGuardCard .ag-btn-login {
      display: block; width: 100%; padding: 12px;
      background: #3b82f6; color: #fff; border: none;
      border-radius: 10px; font-family: 'DM Sans', sans-serif;
      font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none;
      transition: background 0.15s;
    }
    #authGuardCard .ag-btn-login:hover { background: #2563eb; }
    #authGuardCard .ag-btn-back {
      display: block; margin-top: 12px;
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: #6b6b6b;
      background: none; border: none; cursor: pointer; text-decoration: none;
      transition: color 0.15s;
    }
    #authGuardCard .ag-btn-back:hover { color: #f0f0f0; }
    `;
    document.head.appendChild(s);
  }

  function _showAuthPopup() {
    _injectPopupStyles();
    if (document.getElementById('authGuardOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'authGuardOverlay';
    overlay.innerHTML = `
      <div id="authGuardCard">
        <div class="ag-icon">🔒</div>
        <h2>Connexion requise</h2>
        <p>Il faut se connecter à son compte pour accéder aux options du site.</p>
        <a href="login.html" class="ag-btn-login">Se connecter</a>
        <a href="index.html" class="ag-btn-back">← Retour à l'accueil</a>
      </div>`;
    document.body.appendChild(overlay);
    // block scroll
    document.body.style.overflow = 'hidden';
  }

  window.LazyAuth.requireAuthOrPopup = async () => {
    const { data: { session } } = await window.sb.auth.getSession();
    if (!session) {
      _showAuthPopup();
      return null;
    }
    return session;
  };

  /* ── Util ────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
