/**
 * sidebar.js — Composant sidebar LazyPO
 *
 * Comportement :
 *  - Réduit (64px) par défaut → icônes seulement
 *  - Élargi (260px) au survol → icônes + labels visibles
 *  - Description de l'item visible au survol de l'item (sidebar déjà élargie)
 *  - Pas de badge de statut — tous les items ont le même style
 */
(function () {

  /* ═══════════════════════════════════════════════════
     CONFIG
  ═══════════════════════════════════════════════════ */
  const ITEMS = [
    {
      id: 'home',
      icon: '🏠',
      label: 'Home',
      url: 'index.html',
      desc: 'Back to the LazyPO main page.'
    },
    { divider: true },
    {
      id: 'scope',
      icon: '✉️',
      label: 'Scope of Work',
      url: 'lazypo_generator.html',
      desc: 'Generate professional Scope of Work emails. Export as .eml ready for Outlook.'
    },
    {
      id: 'sprint',
      icon: '📋',
      label: 'Sprint Planning',
      url: 'sprintplanner.html',
      desc: 'Plan your sprints and auto-generate your presentation slides.'
    },
    {
      id: 'jira',
      icon: '🎫',
      label: 'Jira',
      url: 'jirarepo.html',
      desc: 'Create and manage your Jira queries without leaving your workflow.'
    },
    {
      id: 'livenote',
      icon: '📝',
      label: 'LiveNote',
      url: 'livenote.html',
      desc: 'Éditeur collaboratif en temps réel — écrivez ensemble, instantanément.'
    },
    {
      id: 'minutehub',
      icon: '📝',
      label: 'Minute Hub',
      url: null,
      desc: 'Centralise all your meeting notes in one click.'
    },
    {
      id: 'focusfm',
      icon: '🎵',
      label: 'Focus FM',
      url: null,
      onClick: "window.FocusFM?.open()",
      desc: 'Spotify integration — play your playlists without leaving the app.'
    },
    { divider: true },
    {
      id: 'account',
      icon: '👤',
      label: 'My Account',
      url: 'account.html',
      desc: 'Manage your profile, avatar and password.'
    }
  ];

  /* ═══════════════════════════════════════════════════
     ACTIVE PAGE DETECTION
  ═══════════════════════════════════════════════════ */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  function isActive(item) {
    if (!item.url) return false;
    return item.url === currentFile || (currentFile === '' && item.url === 'index.html');
  }

  /* ═══════════════════════════════════════════════════
     CSS
  ═══════════════════════════════════════════════════ */
  const css = `
    /* ── Shell ── */
    .sb {
      position: fixed; left: 0; top: 0; height: 100vh;
      width: 64px;
      background: #111111;
      border-right: 1px solid #222222;
      z-index: 200;
      overflow: hidden;
      display: flex; flex-direction: column;
      padding: 24px 0 20px;
      transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sb:hover { width: 260px; }

    /* Subtle blue line on right edge */
    .sb::after {
      content: '';
      position: absolute; top: 15%; right: -1px; bottom: 15%;
      width: 1px;
      background: linear-gradient(to bottom, transparent, rgba(59,130,246,0.35), transparent);
      pointer-events: none;
    }

    /* ── Logo ── */
    .sb-logo-wrap {
      display: flex; align-items: center;
      height: 44px; margin-bottom: 28px;
      padding: 0 16px;
      min-width: 260px; /* prevent shrinking inside overflow:hidden */
      text-decoration: none;
      flex-shrink: 0;
    }
    .sb-logo-star {
      font-family: 'Permanent Marker', cursive;
      font-size: 24px; color: #60a5fa;
      width: 32px; flex-shrink: 0; text-align: center; display: block;
      text-shadow: 0 0 12px rgba(96,165,250,0.4);
    }
    .sb-logo-name {
      font-family: 'Permanent Marker', cursive;
      font-size: 24px; color: #fff; letter-spacing: 1px;
      text-shadow: 2px 2px 0 rgba(59,130,246,0.4);
      margin-left: 10px;
      opacity: 0;
      transition: opacity 0.18s ease 0.06s;
      white-space: nowrap;
    }
    .sb:hover .sb-logo-name { opacity: 1; }

    /* ── Nav list ── */
    .sb-nav {
      display: flex; flex-direction: column;
      gap: 2px; padding: 0 8px;
    }

    /* ── Divider ── */
    .sb-divider {
      height: 1px; background: #1e1e1e;
      margin: 8px 8px;
      min-width: 244px;
      opacity: 0;
      transition: opacity 0.18s ease;
    }
    .sb:hover .sb-divider { opacity: 1; }

    /* ── Item wrapper ── */
    .sb-item { position: relative; min-width: 244px; }

    /* ── Link / Button row ── */
    .sb-item-link {
      display: flex; align-items: center;
      gap: 12px; padding: 8px 8px;
      color: #5a5a5a; font-size: 14px; font-weight: 500;
      text-decoration: none; border: none; background: none;
      border-radius: 8px; cursor: pointer;
      width: 100%; text-align: left;
      transition: color 0.15s, background 0.15s;
      position: relative;
      min-width: 244px;
      font-family: 'DM Sans', sans-serif;
    }
    .sb-item:hover .sb-item-link {
      color: #f0f0f0; background: #1a1a1a;
    }
    .sb-item.active .sb-item-link {
      color: #f0f0f0; background: #1c1c1c;
    }
    /* Active left bar */
    .sb-item.active .sb-item-link::before {
      content: '';
      position: absolute; left: -8px; top: 18%; bottom: 18%;
      width: 2px; background: #60a5fa; border-radius: 2px;
      box-shadow: 0 0 8px rgba(96,165,250,0.7);
    }

    /* ── Icon ── */
    .sb-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: #232323;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
      transition: background 0.15s;
    }
    .sb-item.active .sb-icon { background: rgba(59,130,246,0.14); }
    .sb-item:hover   .sb-icon { background: #2a2a2a; }

    /* ── Label ── */
    .sb-label {
      opacity: 0;
      transition: opacity 0.18s ease 0.06s;
      white-space: nowrap; overflow: hidden;
      flex: 1;
    }
    .sb:hover .sb-label { opacity: 1; }

    /* ── Description (visible on item hover when sidebar is expanded) ── */
    .sb-desc {
      max-height: 0; overflow: hidden;
      padding: 0 8px 0 52px; /* aligned under label */
      font-size: 11.5px; color: #555; line-height: 1.5;
      transition: max-height 0.22s ease, padding-bottom 0.22s ease, color 0.22s;
      white-space: normal;
      min-width: 244px;
    }
    .sb:hover .sb-item:hover .sb-desc {
      max-height: 56px; padding-bottom: 8px; color: #777;
    }

    /* ── Spacer + Footer ── */
    .sb-spacer { flex: 1; }
    .sb-footer {
      display: flex; align-items: center;
      padding: 0 16px; gap: 10px;
      min-width: 244px;
    }
    .sb-footer-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #60a5fa; box-shadow: 0 0 6px rgba(96,165,250,0.6);
      animation: sb-pulse 2.5s ease infinite; flex-shrink: 0;
    }
    @keyframes sb-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.45; transform: scale(0.65); }
    }
    .sb-footer-text {
      font-size: 12px; color: #4a4a4a; white-space: nowrap;
      opacity: 0; transition: opacity 0.18s ease;
    }
    .sb-footer-text strong { color: #555; }
    .sb:hover .sb-footer-text { opacity: 1; }

    /* ── Mobile burger ── */
    .sb-burger {
      display: none;
      position: fixed; top: 16px; left: 16px; z-index: 300;
      width: 40px; height: 40px; border-radius: 10px;
      background: #1c1c1c; border: 1px solid #2a2a2a;
      cursor: pointer; align-items: center; justify-content: center;
      flex-direction: column; gap: 5px;
    }
    .sb-burger span {
      display: block; width: 18px; height: 2px;
      background: #f0f0f0; border-radius: 2px;
      transition: all 0.25s ease;
    }
    .sb-burger.open span:nth-child(1) { transform: rotate(45deg) translate(2.5px, 2.5px); }
    .sb-burger.open span:nth-child(2) { opacity: 0; }
    .sb-burger.open span:nth-child(3) { transform: rotate(-45deg) translate(2.5px, -2.5px); }

    .sb-overlay {
      display: none; position: fixed; inset: 0; z-index: 190;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
    }
    .sb-overlay.open { display: block; }

    .sb-close-btn {
      display: none;
      position: absolute; top: 14px; right: 14px;
      width: 30px; height: 30px; border-radius: 7px;
      background: #1c1c1c; border: 1px solid #2a2a2a;
      cursor: pointer; align-items: center; justify-content: center;
      color: #666; font-size: 14px;
    }

    /* ── Body offset (desktop) — donne de la place à la sidebar fixe ── */
    @media (min-width: 769px) {
      body { padding-left: 64px !important; }
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .sb {
        transform: translateX(-100%);
        width: 260px !important; /* always full width on mobile */
        transition: transform 0.28s ease;
      }
      .sb.open { transform: translateX(0); }
      .sb-burger     { display: flex; }
      .sb-close-btn  { display: flex; }
      /* Labels and desc always visible on mobile */
      .sb-logo-name,
      .sb-label,
      .sb-footer-text,
      .sb-divider { opacity: 1 !important; }
      .sb.open .sb-item:hover .sb-desc { max-height: 56px; padding-bottom: 8px; color: #777; }
    }

    /* ── Slide-in animation ── */
    .sb-item { animation: sb-in 0.38s ease both; }
    .sb-item:nth-child(1) { animation-delay: 0.04s; }
    .sb-item:nth-child(2) { animation-delay: 0.08s; }
    .sb-item:nth-child(3) { animation-delay: 0.12s; }
    .sb-item:nth-child(4) { animation-delay: 0.16s; }
    .sb-item:nth-child(5) { animation-delay: 0.20s; }
    .sb-item:nth-child(6) { animation-delay: 0.24s; }
    @keyframes sb-in {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.id = 'sb-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ═══════════════════════════════════════════════════
     HTML BUILDER
  ═══════════════════════════════════════════════════ */
  function buildItem(item) {
    if (item.divider) return '<div class="sb-divider"></div>';

    const active     = isActive(item) ? ' active' : '';
    const tag        = item.url ? 'a' : 'button';
    const hrefAttr   = item.url ? `href="${item.url}"` : 'type="button"';
    const clickAttr  = !item.url
      ? `onclick="${item.onClick || `window.showUnavailablePopup && window.showUnavailablePopup('${item.label}')`}"`
      : '';

    return `
      <div class="sb-item${active}" data-sb-id="${item.id}">
        <${tag} class="sb-item-link" ${hrefAttr} ${clickAttr}>
          <div class="sb-icon">${item.icon}</div>
          <span class="sb-label">${item.label}</span>
        </${tag}>
        <div class="sb-desc">${item.desc}</div>
      </div>`;
  }

  const html = `
    <button class="sb-burger" id="sb-burger" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <div class="sb-overlay" id="sb-overlay"></div>

    <aside class="sb" id="sb-sidebar">
      <a href="index.html" class="sb-logo-wrap" aria-label="LazyPO — Home">
        <span class="sb-logo-star">✦</span>
        <span class="sb-logo-name">LazyPO</span>
      </a>
      <button class="sb-close-btn" id="sb-close" aria-label="Fermer">✕</button>

      <nav class="sb-nav" aria-label="Navigation principale">
        ${ITEMS.map(buildItem).join('\n')}
      </nav>

      <div class="sb-spacer"></div>
      <div class="sb-footer">
        <div class="sb-footer-dot"></div>
        <div class="sb-footer-text">v2.0 · <strong>100% local</strong></div>
      </div>
    </aside>`;

  /* ═══════════════════════════════════════════════════
     INJECT
  ═══════════════════════════════════════════════════ */
  document.body.insertAdjacentHTML('afterbegin', html);

  /* ═══════════════════════════════════════════════════
     MOBILE LOGIC
  ═══════════════════════════════════════════════════ */
  const sidebar  = document.getElementById('sb-sidebar');
  const burger   = document.getElementById('sb-burger');
  const overlay  = document.getElementById('sb-overlay');
  const closeBtn = document.getElementById('sb-close');

  function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('open'); burger.classList.add('open'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); burger.classList.remove('open'); }

  burger.addEventListener('click',  () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  overlay.addEventListener('click', closeSidebar);
  closeBtn.addEventListener('click', closeSidebar);

})();
