/**
 * popup.js — Popup "Service indisponible" LazyPO
 *
 * Usage : <script src="popup.js"></script>
 * Puis   : window.showUnavailablePopup('Nom du produit')
 *
 * ──────────────────────────────────────────────────
 *  Pour activer/désactiver le popup globalement,
 *  changer POPUP_ENABLED ci-dessous.
 * ──────────────────────────────────────────────────
 */
(function () {
  /* ═══════════════════════════════════════════════════
     CONFIG
  ═══════════════════════════════════════════════════ */
  const POPUP_ENABLED  = true;   // ← false pour désactiver globalement
  const POPUP_DURATION = 6000;   // ms avant fermeture automatique

  /* ═══════════════════════════════════════════════════
     CSS
  ═══════════════════════════════════════════════════ */
  const css = `
    /* Backdrop */
    .lp-popup-backdrop {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .lp-popup-backdrop.show { opacity: 1; pointer-events: all; }

    /* Modal */
    .lp-popup {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -46%) scale(0.96);
      z-index: 9999;
      background: #111111;
      border: 1px solid #1e1e1e;
      border-radius: 20px;
      padding: 32px 32px 24px;
      max-width: 440px; width: calc(100vw - 48px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(96,165,250,0.08);
      opacity: 0; pointer-events: none;
      transition: opacity 0.35s cubic-bezier(0.34,1.56,0.64,1),
                  transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    .lp-popup.show {
      opacity: 1; transform: translate(-50%, -50%) scale(1);
      pointer-events: all;
    }

    /* Header */
    .lp-popup-header {
      display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px;
    }
    .lp-popup-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      background: rgba(96,165,250,0.1);
      border: 1px solid rgba(96,165,250,0.2);
      display: flex; align-items: center; justify-content: center;
    }
    .lp-popup-icon svg { width: 20px; height: 20px; color: #60a5fa; }
    .lp-popup-titles { flex: 1; }
    .lp-popup-title {
      font-family: 'DM Sans', 'Segoe UI', sans-serif;
      font-size: 15px; font-weight: 700; color: #f0f0f0;
      margin-bottom: 3px;
    }
    .lp-popup-product {
      font-family: 'DM Mono', monospace;
      font-size: 11px; font-weight: 500; color: #60a5fa;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .lp-popup-close {
      margin-left: 4px; flex-shrink: 0;
      width: 28px; height: 28px; border-radius: 8px;
      background: none; border: 1px solid #2a2a2a;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: #555; font-size: 13px;
      transition: background 0.15s, color 0.15s;
    }
    .lp-popup-close:hover { background: #1e1e1e; color: #aaa; }

    /* Divider */
    .lp-popup-divider {
      height: 1px; background: #1e1e1e; margin-bottom: 16px;
    }

    /* Message */
    .lp-popup-msg {
      font-family: 'DM Sans', 'Segoe UI', sans-serif;
      font-size: 13.5px; color: #999; line-height: 1.65;
      margin-bottom: 20px;
    }
    .lp-popup-msg strong { color: #c0c0c0; font-weight: 600; }

    /* Progress bar */
    .lp-popup-bar {
      height: 2px; background: #1e1e1e; border-radius: 2px; overflow: hidden;
    }
    .lp-popup-bar-fill {
      height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa);
      border-radius: 2px; width: 100%;
    }

    @media (max-width: 480px) {
      .lp-popup { padding: 24px 20px 18px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.id = 'lp-popup-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ═══════════════════════════════════════════════════
     DOM
  ═══════════════════════════════════════════════════ */
  const backdrop = document.createElement('div');
  backdrop.className = 'lp-popup-backdrop';
  backdrop.id = 'lp-popup-backdrop';
  document.body.appendChild(backdrop);

  const popup = document.createElement('div');
  popup.className = 'lp-popup';
  popup.id = 'lp-popup';
  popup.innerHTML = `
    <div class="lp-popup-header">
      <div class="lp-popup-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="lp-popup-titles">
        <div class="lp-popup-title">Feature unavailable</div>
        <div class="lp-popup-product" id="lp-popup-product">—</div>
      </div>
      <button class="lp-popup-close" id="lp-popup-close" aria-label="Close">✕</button>
    </div>
    <div class="lp-popup-divider"></div>
    <p class="lp-popup-msg">
      <strong>Patience, bruv!</strong> Ndashiz is still cooking up something tasty.
      Grab a beer, chill with friends, and come back for the new features.
    </p>
    <div class="lp-popup-bar">
      <div class="lp-popup-bar-fill" id="lp-popup-bar-fill"></div>
    </div>
  `;
  document.body.appendChild(popup);

  /* ═══════════════════════════════════════════════════
     LOGIC
  ═══════════════════════════════════════════════════ */
  let dismissTimer = null;

  document.getElementById('lp-popup-close').addEventListener('click', hidePopup);
  backdrop.addEventListener('click', hidePopup);

  function showUnavailablePopup(productName) {
    if (!POPUP_ENABLED) return;

    clearTimeout(dismissTimer);

    // Update product name
    document.getElementById('lp-popup-product').textContent =
      productName || 'Bientôt disponible';

    // Show popup + backdrop
    popup.classList.add('show');
    backdrop.classList.add('show');

    // Animate progress bar
    const bar = document.getElementById('lp-popup-bar-fill');
    bar.style.transition = 'none';
    bar.style.width = '100%';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bar.style.transition = 'width ' + POPUP_DURATION + 'ms linear';
        bar.style.width = '0%';
      });
    });

    dismissTimer = setTimeout(hidePopup, POPUP_DURATION);
  }

  function hidePopup() {
    clearTimeout(dismissTimer);
    popup.classList.remove('show');
    backdrop.classList.remove('show');
  }

  // Expose globally so sidebar.js and other scripts can call it
  window.showUnavailablePopup = showUnavailablePopup;
})();
