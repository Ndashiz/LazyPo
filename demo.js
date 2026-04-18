/* ═══════════════════════════════════════════════
   LazyPO — Global Demo Mode
   ─────────────────────────────────────────────
   Include this script on any feature page that
   defines  window.loadDemoData().
   Automatically injects a floating 🧪 button
   that loads mock data into that page.
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  var FAB_ID = '_lazypo_demo_fab';

  function injectFab() {
    if (typeof window.loadDemoData !== 'function') return;
    if (document.getElementById(FAB_ID)) return;

    var btn = document.createElement('button');
    btn.id        = FAB_ID;
    btn.title     = 'Load demo data';
    btn.innerHTML = '🧪';
    btn.setAttribute('aria-label', 'Demo mode');

    var css = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
      'width:48px', 'height:48px', 'border-radius:50%',
      'border:2px solid rgba(245,158,11,.4)',
      'background:rgba(12,12,12,.96)',
      'color:#fbbf24', 'cursor:pointer',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-size:20px', 'line-height:1',
      'box-shadow:0 4px 20px rgba(0,0,0,.6)',
      'transition:all .2s ease',
      'backdrop-filter:blur(10px)',
      '-webkit-backdrop-filter:blur(10px)',
      'font-family:DM Sans,sans-serif',
      'outline:none', 'padding:0',
    ].join(';');
    btn.style.cssText = css;

    function setIdle() {
      btn.style.transform   = 'scale(1)';
      btn.style.borderColor = 'rgba(245,158,11,.4)';
      btn.style.boxShadow   = '0 4px 20px rgba(0,0,0,.6)';
      btn.style.color       = '#fbbf24';
      btn.style.pointerEvents = '';
    }

    btn.addEventListener('mouseenter', function () {
      btn.style.transform   = 'scale(1.12)';
      btn.style.borderColor = '#fbbf24';
      btn.style.boxShadow   = '0 6px 28px rgba(245,158,11,.3)';
    });
    btn.addEventListener('mouseleave', setIdle);

    btn.addEventListener('click', function () {
      btn.innerHTML           = '⏳';
      btn.style.pointerEvents = 'none';
      try {
        var result = window.loadDemoData();
        if (result && typeof result.then === 'function') {
          result.then(onDone).catch(onDone);
        } else {
          onDone();
        }
      } catch (e) {
        console.warn('[LazyPO Demo]', e);
        onDone();
      }
    });

    function onDone() {
      btn.innerHTML         = '✓';
      btn.style.color       = '#34d399';
      btn.style.borderColor = '#34d399';
      btn.style.boxShadow   = '0 6px 28px rgba(52,211,153,.25)';
      setTimeout(setIdle, 2500);
      btn.innerHTML = '✓';
    }

    document.body.appendChild(btn);
  }

  /* Retry until loadDemoData is defined (some pages set it inside DOMContentLoaded) */
  function tryInject() {
    injectFab();
    if (!document.getElementById(FAB_ID)) {
      setTimeout(injectFab, 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject);
  } else {
    tryInject();
  }
})();
