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
    .lp-popup {
      position: fixed; bottom: 32px; right: 32px; z-index: 9999;
      background: #161616;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 20px 22px 16px;
      max-width: 380px; width: calc(100vw - 48px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.06);
      opacity: 0; transform: translateY(16px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.35s cubic-bezier(0.34,1.56,0.64,1),
                  transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    .lp-popup.show {
      opacity: 1; transform: translateY(0) scale(1);
      pointer-events: all;
    }

    /* Header */
    .lp-popup-header {
      display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;
    }
    .lp-popup-icon {
      width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      background: rgba(245,158,11,0.1);
      border: 1px solid rgba(245,158,11,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .lp-popup-titles { flex: 1; }
    .lp-popup-title {
      font-family: 'DM Sans', sans-serif;
      font-size: 14px; font-weight: 700; color: #f0f0f0;
      margin-bottom: 2px;
    }
    .lp-popup-product {
      font-family: 'DM Mono', monospace;
      font-size: 11px; font-weight: 500; color: #f59e0b;
      letter-spacing: 0.04em;
    }
    .lp-popup-close {
      margin-left: 4px; flex-shrink: 0;
      width: 26px; height: 26px; border-radius: 7px;
      background: none; border: 1px solid #2a2a2a;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: #555; font-size: 13px;
      transition: background 0.15s, color 0.15s;
    }
    .lp-popup-close:hover { background: #2a2a2a; color: #999; }

    /* Message */
    .lp-popup-msg {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; color: #888; line-height: 1.6;
      font-style: italic;
      border-left: 2px solid #2a2a2a;
      padding-left: 12px; margin-bottom: 14px;
    }

    /* Progress bar */
    .lp-popup-bar {
      height: 2px; background: #222; border-radius: 2px; overflow: hidden;
    }
    .lp-popup-bar-fill {
      height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24);
      border-radius: 2px; width: 100%;
    }

    @media (max-width: 480px) {
      .lp-popup { bottom: 16px; right: 16px; left: 16px; max-width: none; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.id = 'lp-popup-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ═══════════════════════════════════════════════════
     DOM
  ═══════════════════════════════════════════════════ */
  const popup = document.createElement('div');
  popup.className = 'lp-popup';
  popup.id = 'lp-popup';
  popup.innerHTML = `
    <div class="lp-popup-header">
      <div class="lp-popup-icon">🍺</div>
      <div class="lp-popup-titles">
        <div class="lp-popup-title">Service indisponible</div>
        <div class="lp-popup-product" id="lp-popup-product">—</div>
      </div>
      <button class="lp-popup-close" id="lp-popup-close" aria-label="Fermer">✕</button>
    </div>
    <p class="lp-popup-msg">
      "Ndashiz is still cooking — have fun, have a beer with your friends
      while your buddy is cooking a new experience 🍻"
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

  function showUnavailablePopup(productName) {
    if (!POPUP_ENABLED) return;

    clearTimeout(dismissTimer);

    // Update product name
    document.getElementById('lp-popup-product').textContent =
      productName || 'Bientôt disponible';

    // Show popup
    popup.classList.add('show');

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
  }

  // Expose globally so sidebar.js and other scripts can call it
  window.showUnavailablePopup = showUnavailablePopup;
})();
