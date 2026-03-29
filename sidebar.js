/**
 * sidebar.js — Composant sidebar LazyPO
 * Injecte automatiquement la sidebar + burger mobile dans n'importe quelle page.
 *
 * Usage : <script src="sidebar.js"></script> avant </body>
 */
(function () {
  /* ═══════════════════════════════════════════════════
     CONFIG — Navigation items
  ═══════════════════════════════════════════════════ */
  const NAV_HOME = {
    id: 'home',
    icon: '🏠',
    label: 'Accueil',
    url: 'index.html',
    badge: null,
    desc: 'Retour à la page principale de LazyPO.'
  };

  const NAV_TOOLS = [
    {
      id: 'scope',
      icon: '✉️',
      label: 'Scope of Work',
      url: 'lazypo_generator.html',
      badge: { text: 'Live', cls: 'badge-live' },
      desc: 'Génère tes emails de Scope of Work professionnels en quelques clics. Export .eml prêt pour Outlook.'
    },
    {
      id: 'sprint',
      icon: '📋',
      label: 'Sprint Planning',
      url: 'sprintplanning.html',
      badge: { text: 'En cours', cls: 'badge-wip' },
      desc: 'Planifie tes sprints et génère automatiquement tes slides de présentation PowerPoint.'
    },
    {
      id: 'jira',
      icon: '🎫',
      label: 'Jira',
      url: 'jirarepo.html',
      badge: { text: 'En cours', cls: 'badge-wip' },
      desc: 'Crée et gère tes tickets Jira rapidement sans quitter ton workflow PO.'
    },
    {
      id: 'minutehub',
      icon: '📝',
      label: 'Minute Hub',
      url: null,
      badge: { text: 'Bientôt', cls: 'badge-soon' },
      desc: 'Centralise et partage tes compte-rendus de réunion en un clin d\'œil.'
    },
    {
      id: 'focusfm',
      icon: '🎯',
      label: 'Focus FM',
      url: null,
      badge: { text: 'Bientôt', cls: 'badge-soon' },
      desc: 'Garde le focus sur tes priorités et booste ta productivité au quotidien.'
    }
  ];

  /* ═══════════════════════════════════════════════════
     ACTIVE PAGE DETECTION
  ═══════════════════════════════════════════════════ */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';

  function isActive(item) {
    if (!item.url) return false;
    if (currentFile === '' || currentFile === '/') return item.url === 'index.html';
    return item.url === currentFile;
  }

  /* ═══════════════════════════════════════════════════
     CSS
  ═══════════════════════════════════════════════════ */
  const css = `
    /* ── Sidebar shell ── */
    .sb {
      width: 260px; min-width: 260px;
      height: 100vh;
      background: #111111;
      border-right: 1px solid #222222;
      display: flex; flex-direction: column;
      padding: 28px 16px 24px;
      position: relative; z-index: 100;
      flex-shrink: 0;
    }
    .sb::after {
      content: '';
      position: absolute; top: 15%; right: -1px; bottom: 15%;
      width: 1px;
      background: linear-gradient(to bottom, transparent, rgba(59,130,246,0.4), transparent);
    }

    /* ── Logo ── */
    .sb-logo-wrap {
      padding: 0 8px; margin-bottom: 36px;
      display: flex; align-items: center;
    }
    .sb-logo {
      font-family: 'Permanent Marker', cursive;
      font-size: 28px; color: #fff; letter-spacing: 1px; line-height: 1;
      text-shadow: 2px 2px 0 rgba(59,130,246,0.5), -1px -1px 0 rgba(255,255,255,0.06);
      transform: rotate(-1.5deg); display: inline-block;
      text-decoration: none;
    }
    .sb-logo span { color: #60a5fa; }

    /* ── Section label ── */
    .sb-section-label {
      font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
      text-transform: uppercase; color: #6b6b6b;
      padding: 0 12px; margin-bottom: 8px; margin-top: 4px;
    }

    /* ── Nav list ── */
    .sb-nav { display: flex; flex-direction: column; gap: 3px; }

    /* ── Nav item wrapper ── */
    .sb-item {
      border-radius: 10px; border: 1px solid transparent;
      overflow: hidden;
    }
    .sb-item:hover { background: #161616; }
    .sb-item.active {
      background: #1c1c1c; border-color: #2a2a2a;
    }

    /* ── Nav item row ── */
    .sb-item-row {
      display: flex; align-items: center; gap: 11px;
      padding: 10px 12px;
      color: #6b6b6b; font-size: 14px; font-weight: 500;
      text-decoration: none; position: relative;
      transition: color 0.15s;
      cursor: pointer;
    }
    .sb-item:hover .sb-item-row  { color: #f0f0f0; }
    .sb-item.active .sb-item-row { color: #f0f0f0; }
    .sb-item.active .sb-item-row::before {
      content: '';
      position: absolute; left: 0; top: 20%; bottom: 20%;
      width: 2px; background: #60a5fa; border-radius: 2px;
      box-shadow: 0 0 8px #60a5fa;
    }

    /* ── Icon ── */
    .sb-icon {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; background: #2e2e2e; flex-shrink: 0;
      transition: background 0.15s;
    }
    .sb-item.active .sb-icon { background: rgba(59,130,246,0.15); }
    .sb-item:hover   .sb-icon { background: #2a2a2a; }

    .sb-name { flex: 1; }

    /* ── Badges ── */
    .sb-badge {
      font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
      padding: 2px 7px; border-radius: 20px; text-transform: uppercase;
    }
    .badge-live { background: rgba(59,130,246,0.15); color: #60a5fa;  border: 1px solid rgba(96,165,250,0.25); }
    .badge-soon { background: rgba(80,80,80,0.3);    color: #888;     border: 1px solid #333; }
    .badge-wip  { background: rgba(245,158,11,0.1);  color: #f59e0b;  border: 1px solid rgba(245,158,11,0.2); }

    /* ── Chevron toggle ── */
    .sb-chevron {
      width: 22px; height: 22px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px; color: #3a3a3a; font-size: 11px;
      transition: transform 0.25s ease, color 0.15s, background 0.15s;
      background: none; border: none; cursor: pointer;
    }
    .sb-chevron:hover { background: #2a2a2a; color: #888; }
    .sb-item.expanded .sb-chevron { transform: rotate(180deg); color: #60a5fa; }

    /* ── Expandable description ── */
    .sb-desc {
      max-height: 0; overflow: hidden;
      padding: 0 12px;
      font-size: 12px; color: #555; line-height: 1.55;
      transition: max-height 0.3s ease, padding-bottom 0.3s ease, color 0.3s ease;
    }
    .sb-item.expanded .sb-desc {
      max-height: 100px; padding-bottom: 12px; color: #888;
    }

    /* ── Divider ── */
    .sb-divider { height: 1px; background: #222222; margin: 14px 4px; }

    /* ── Spacer + footer ── */
    .sb-spacer { flex: 1; }
    .sb-footer { padding: 0 8px; display: flex; align-items: center; gap: 10px; }
    .sb-footer-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #60a5fa; box-shadow: 0 0 8px #60a5fa;
      animation: sb-pulse 2.5s ease infinite; flex-shrink: 0;
    }
    @keyframes sb-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.7); }
    }
    .sb-footer-text { font-size: 12px; color: #6b6b6b; }
    .sb-footer-text strong { color: #555; }

    /* ── Close button (mobile) ── */
    .sb-close-btn {
      display: none;
      position: absolute; top: 16px; right: 16px;
      width: 32px; height: 32px; border-radius: 8px;
      background: #1c1c1c; border: 1px solid #2a2a2a;
      cursor: pointer; align-items: center; justify-content: center;
      color: #6b6b6b; font-size: 16px;
    }

    /* ── Burger button (mobile) ── */
    .sb-burger {
      display: none;
      position: fixed; top: 18px; left: 16px; z-index: 200;
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

    /* ── Overlay ── */
    .sb-overlay {
      display: none; position: fixed; inset: 0; z-index: 90;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    }
    .sb-overlay.open { display: block; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .sb {
        position: fixed; top: 0; left: 0; bottom: 0;
        transform: translateX(-100%);
        z-index: 100;
        box-shadow: 4px 0 24px rgba(0,0,0,0.5);
        transition: transform 0.3s ease;
      }
      .sb.open          { transform: translateX(0); }
      .sb-burger        { display: flex; }
      .sb-close-btn     { display: flex; }
    }

    /* ── Slide-in animation for nav items ── */
    .sb-nav .sb-item { animation: sb-slideIn 0.4s ease both; }
    .sb-nav .sb-item:nth-child(1) { animation-delay: 0.05s; }
    .sb-nav .sb-item:nth-child(2) { animation-delay: 0.10s; }
    .sb-nav .sb-item:nth-child(3) { animation-delay: 0.15s; }
    .sb-nav .sb-item:nth-child(4) { animation-delay: 0.20s; }
    .sb-nav .sb-item:nth-child(5) { animation-delay: 0.25s; }
    @keyframes sb-slideIn {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.id = 'sb-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ═══════════════════════════════════════════════════
     HTML BUILDERS
  ═══════════════════════════════════════════════════ */
  function buildItem(item) {
    const active    = isActive(item) ? ' active' : '';
    const badge     = item.badge
      ? `<span class="sb-badge ${item.badge.cls}">${item.badge.text}</span>`
      : '';
    // Unavailable items trigger popup on click
    const rowTag    = item.url ? 'a' : 'button';
    const hrefAttr  = item.url ? `href="${item.url}"` : 'type="button"';
    const clickAttr = !item.url
      ? `onclick="window.showUnavailablePopup && window.showUnavailablePopup('${item.label}')"`
      : '';

    return `
      <div class="sb-item${active}" data-sb-id="${item.id}">
        <${rowTag} class="sb-item-row" ${hrefAttr} ${clickAttr}>
          <div class="sb-icon">${item.icon}</div>
          <span class="sb-name">${item.label}</span>
          ${badge}
          <button class="sb-chevron" data-sb-toggle="${item.id}" aria-label="Voir description" title="Voir description">▾</button>
        </${rowTag}>
        <div class="sb-desc">${item.desc}</div>
      </div>`;
  }

  const sidebarHTML = `
    <button class="sb-burger" id="sb-burger" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <div class="sb-overlay" id="sb-overlay"></div>

    <aside class="sb" id="sb-sidebar">
      <div class="sb-logo-wrap">
        <a href="index.html" class="sb-logo">LazyPO <span>✦</span></a>
      </div>
      <button class="sb-close-btn" id="sb-close" aria-label="Fermer">✕</button>

      <div class="sb-section-label">Navigation</div>
      <nav class="sb-nav">
        ${buildItem(NAV_HOME)}
      </nav>

      <div class="sb-divider"></div>

      <div class="sb-section-label">Outils</div>
      <nav class="sb-nav">
        ${NAV_TOOLS.map(buildItem).join('\n')}
      </nav>

      <div class="sb-spacer"></div>
      <div class="sb-footer">
        <div class="sb-footer-dot"></div>
        <div class="sb-footer-text">v2.0 · <strong>100% local</strong></div>
      </div>
    </aside>`;

  /* ═══════════════════════════════════════════════════
     INJECT INTO DOM
  ═══════════════════════════════════════════════════ */
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  /* ═══════════════════════════════════════════════════
     LOGIC
  ═══════════════════════════════════════════════════ */
  const sidebar  = document.getElementById('sb-sidebar');
  const burger   = document.getElementById('sb-burger');
  const overlay  = document.getElementById('sb-overlay');
  const closeBtn = document.getElementById('sb-close');

  function openSidebar()  {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    burger.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    burger.classList.remove('open');
  }

  burger.addEventListener('click',  () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  overlay.addEventListener('click', closeSidebar);
  closeBtn.addEventListener('click', closeSidebar);

  // Expand / collapse descriptions via chevron
  sidebar.addEventListener('click', function (e) {
    const toggle = e.target.closest('[data-sb-toggle]');
    if (!toggle) return;
    e.preventDefault();
    e.stopPropagation();
    const id   = toggle.dataset.sbToggle;
    const item = sidebar.querySelector(`.sb-item[data-sb-id="${id}"]`);
    if (item) item.classList.toggle('expanded');
  });
})();
