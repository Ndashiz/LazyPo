/* ═══════════════════════════════════════════════
   LazyPO — External Service / API Registry
   ─────────────────────────────────────────────
   Add an entry here when integrating a new
   external service or library. The landing page
   reads window.LAZYPO_APIS and shows the count
   dynamically — no manual update needed.
═══════════════════════════════════════════════ */
window.LAZYPO_APIS = [
  {
    id:    'supabase',
    name:  'Supabase',
    icon:  '🗄️',
    desc:  'Auth, database, realtime & file storage',
    tools: ['all']
  },
  {
    id:    'google-fonts',
    name:  'Google Fonts',
    icon:  '🔤',
    desc:  'DM Sans, DM Mono, Permanent Marker',
    tools: ['all']
  },
  {
    id:    'codemirror',
    name:  'CodeMirror',
    icon:  '✏️',
    desc:  'HTML syntax highlighting editor',
    tools: ['livenote']
  },
  {
    id:    'xlsx',
    name:  'XLSX.js',
    icon:  '📊',
    desc:  'Excel file parsing (.xlsx, .xls, .csv)',
    tools: ['sprint-planning', 'scope-of-work']
  },
  {
    id:    'pptxgenjs',
    name:  'PptxGenJS',
    icon:  '📑',
    desc:  'PowerPoint generation (.pptx export)',
    tools: ['sprint-planning']
  },
];
