/**
 * countdown.js — Composant Progress Bars / Countdown LazyPO
 *
 * Charge les projets depuis projet.json (si dispo),
 * sinon utilise FALLBACK_PROJECTS.
 *
 * Usage : <div id="countdownGrid"></div>
 *         <script src="countdown.js"></script>
 */
(function () {
  /* ═══════════════════════════════════════════════════
     FALLBACK DATA (si projet.json absent)
  ═══════════════════════════════════════════════════ */
  const FALLBACK_PROJECTS = [
    { name: 'REACH',       date: '2025-09-30', color: 'ring-amber', totalDays: 180 },
    { name: 'PI PLANNING', date: '2025-06-15', color: 'ring-white', totalDays: 90  },
  ];

  /* ═══════════════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════════════ */
  const CIRCUMFERENCE = 2 * Math.PI * 44;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* ═══════════════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════════════ */
  function getDaysLeft(targetDate) {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var target = new Date(targetDate + 'T00:00:00');
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return MONTHS[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0') + ', ' + d.getFullYear();
  }

  /* ═══════════════════════════════════════════════════
     CARD BUILDER
  ═══════════════════════════════════════════════════ */
  function buildCard(p, index) {
    var days      = getDaysLeft(p.date);
    var total     = p.totalDays || 90;
    var progress  = Math.max(0, Math.min(1, days / total));
    var offset    = CIRCUMFERENCE * (1 - progress);
    var overdue   = days < 0;
    var imminent  = !overdue && days <= 7;
    var stateClass = overdue ? 'overdue' : imminent ? 'imminent' : '';

    return [
      '<div class="countdown-card ' + stateClass + '" style="animation-delay:' + (0.4 + index * 0.1) + 's">',
      '  <div class="ring-wrap ' + (p.color || 'ring-amber') + '">',
      '    <svg class="ring-svg" viewBox="0 0 100 100">',
      '      <circle class="ring-bg" cx="50" cy="50" r="44"/>',
      '      <circle class="ring-progress" cx="50" cy="50" r="44"',
      '        stroke-dasharray="' + CIRCUMFERENCE + '"',
      '        stroke-dashoffset="' + offset + '"/>',
      '    </svg>',
      '    <div class="ring-center">',
      '      <div class="ring-days">' + (overdue ? Math.abs(days) : days) + '</div>',
      '      <div class="ring-sub">'  + (overdue ? 'DAYS OVER'  : 'DAYS LEFT') + '</div>',
      '    </div>',
      '  </div>',
      '  <div class="countdown-name">' + p.name + '</div>',
      '  <div class="countdown-date">' + formatDate(p.date) + '</div>',
      '</div>'
    ].join('\n');
  }

  /* ═══════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════ */
  function renderCountdown(projects) {
    var grid = document.getElementById('countdownGrid');
    if (!grid) return;
    grid.innerHTML = projects.map(buildCard).join('');
  }

  /* ═══════════════════════════════════════════════════
     INIT — fetch projet.json or use fallback
  ═══════════════════════════════════════════════════ */
  fetch('projet.json')
    .then(function (r) {
      if (!r.ok) throw new Error('not found');
      return r.json();
    })
    .then(function (data) { renderCountdown(data); })
    .catch(function ()    { renderCountdown(FALLBACK_PROJECTS); });
})();
