// Everything on the site comes from the Unlag app itself (src/data.js, core/Tweaks.cs, README).

export const DOWNLOAD_URL = 'https://download.unlag.pro';
export const VERSION = '1.0.10';

// One-time prices per PC (a plan is bound to one HWID), same as the app's Plans page.
export const PRICES = {
  free: '0 €',
  premium: '14,99 €',
  ultra: '29,99 €',
};

// Only counts and plain descriptions are published. The tweak list itself stays in the app.
export const CATEGORIES = [
  {
    id: 'windows', name: 'General', plan: 'Free', count: 36, recommended: 11, reboot: 9,
    risk: { safe: 23, moderate: 11, advanced: 2 },
    areas: [['Interface', 13], ['Power', 7], ['Scheduling', 5], ['Input', 4], ['Updates', 4], ['Display', 3]],
    outcomes: [
      'Fewer tips, widgets and notifications in your way',
      'Raw mouse and keyboard input, without acceleration',
      'The game in front gets the CPU first',
      'No forced restart or sleep in the middle of a match',
    ],
  },
  {
    id: 'performance', name: 'Performance', plan: 'Premium', count: 28, recommended: 6, reboot: 18,
    risk: { safe: 11, moderate: 13, advanced: 4 },
    areas: [['Storage', 10], ['GPU', 9], ['CPU', 5], ['RAM', 4]],
    outcomes: [
      'A CPU that stays awake instead of parking cores',
      'Driver settings for NVIDIA, AMD and Intel graphics',
      'More memory left for the game',
      'Drives that do not fall asleep during a load',
    ],
  },
  {
    id: 'network', name: 'Network', plan: 'Premium', count: 21, recommended: 5, reboot: 5,
    risk: { safe: 11, moderate: 6, advanced: 4 },
    areas: [['Bandwidth', 7], ['Latency', 4], ['DNS', 3], ['Adapter', 3], ['Protocols', 3], ['Wireless', 1]],
    outcomes: [
      'Small packets sent right away, not batched',
      'Bandwidth Windows keeps for itself, given back',
      'Faster name lookups',
      'Network adapter power saving turned off',
    ],
  },
  {
    id: 'privacy', name: 'Privacy', plan: 'Free', count: 32, recommended: 12, reboot: 1,
    risk: { safe: 20, moderate: 8, advanced: 4 },
    areas: [['App permissions', 11], ['Telemetry', 9], ['Search', 5], ['Ads', 4], ['Account', 3]],
    outcomes: [
      'Telemetry and diagnostics cut at the source',
      'No advertising ID and no sponsored app installs',
      'Search stays on your PC, without Bing',
      'Camera, microphone and files closed to apps you did not allow',
    ],
  },
];

export const TOTAL_TWEAKS = CATEGORIES.reduce((sum, c) => sum + c.count, 0);
export const RISK_TOTAL = CATEGORIES.reduce((t, c) => {
  Object.entries(c.risk).forEach(([k, n]) => { t[k] = (t[k] || 0) + n; });
  return t;
}, {});

export const BLOATWARE = [
  { id: 'app-teams', name: 'Teams (personal)', size: 320 },
  { id: 'app-spotify', name: 'Spotify (promoted)', size: 280 },
  { id: 'app-onedrive', name: 'OneDrive', size: 265 },
  { id: 'app-automate', name: 'Power Automate', size: 245 },
  { id: 'app-clipchamp', name: 'Clipchamp', size: 210 },
  { id: 'app-mail', name: 'Mail and Calendar', size: 188 },
  { id: 'app-solitaire', name: 'Solitaire Collection', size: 154 },
  { id: 'app-phone', name: 'Phone Link', size: 140 },
  { id: 'app-mixed', name: 'Mixed Reality Portal', size: 130 },
  { id: 'app-copilot', name: 'Copilot', size: 96 },
  { id: 'app-xbox', name: 'Xbox Console Companion', size: 92 },
  { id: 'app-maps', name: 'Maps', size: 71 },
  { id: 'app-feedback', name: 'Feedback Hub', size: 64 },
  { id: 'app-todo', name: 'Microsoft To Do', size: 58 },
  { id: 'app-news', name: 'Microsoft News', size: 48 },
  { id: 'app-weather', name: 'Weather', size: 36 },
  { id: 'app-gethelp', name: 'Get Help', size: 22 },
  { id: 'app-tips', name: 'Tips', size: 18 },
];

export const CATEGORY_LINES = {
  windows: 'How Windows looks and behaves, tuned for gaming',
  performance: 'CPU, GPU, memory and storage',
  network: 'Lower ping and packets sent without waiting',
  privacy: 'What Windows sends to Microsoft, cut at the source',
};

export const RISK_LABEL = { safe: 'Safe', moderate: 'Moderate', advanced: 'Advanced' };

// Real tweaks with their real registry change. `from` is the Windows default.
export const LEDGER = [
  {
    id: 'net-throttle',
    name: 'Remove Network Throttling',
    path: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile',
    key: 'NetworkThrottlingIndex',
    from: '10',
    to: 'ffffffff',
  },
  {
    id: 'perf-timer',
    name: 'High Precision Timer',
    path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel',
    key: 'GlobalTimerResolutionRequests',
    from: 'missing',
    to: '1',
  },
  {
    id: 'priv-telemetry',
    name: 'Disable Telemetry',
    path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
    key: 'AllowTelemetry',
    from: 'missing',
    to: '0',
  },
];

export const NETWORK_ROWS = [
  { name: 'Remove Network Throttling', desc: 'Disables the multimedia throttling index that caps non-media traffic', impact: 'Medium', on: true, open: true },
  { name: 'Disable Delivery Optimization', desc: 'Stops Windows from uploading updates to other PCs over your connection', impact: 'Medium', on: true },
  { name: 'Optimize TCP Auto-Tuning', desc: 'Sets TCP auto-tuning to Normal so fast connections are not capped', impact: 'Low', on: false },
  { name: 'Release Reserved Bandwidth', desc: 'Frees the bandwidth Windows keeps aside for QoS-aware applications', impact: 'Low', on: false },
  { name: 'Faster Port Reuse', desc: 'Opens the full port range and frees closed connections after 30 s', impact: 'Low', on: false },
];

export const TOOLS = [
  { id: 'gamemode', name: 'Game Mode', line: 'The gaming tweaks gathered on one page' },
  { id: 'cleaner', name: 'Cleaner', line: 'Deletes temporary files and caches' },
  { id: 'debloat', name: 'Debloat', line: `Uninstalls ${BLOATWARE.length} preinstalled Windows apps` },
  { id: 'backups', name: 'Backups', line: 'Creates Windows System Restore points' },
  { id: 'bios', name: 'BIOS', line: 'Writes firmware settings through AMI SCEWIN' },
  { id: 'assistant', name: 'Assistant', line: 'Knows your hardware and suggests tweaks to enable' },
];

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    line: 'Clean up Windows and take back your privacy',
    pages: ['Home', 'General', 'Privacy', 'Cleaner', 'Debloat', 'Backups'],
    perks: ['30 essential tweaks'],
    ai: 3,
  },
  {
    id: 'premium',
    name: 'Premium',
    line: 'Lower latency in games and online',
    inherits: 'Free',
    pages: ['Performance', 'Game Mode', 'Network'],
    perks: ['143 tweaks, moderate ones included', 'Priority support'],
    ai: 7,
  },
  {
    id: 'ultra',
    name: 'Ultimate',
    line: 'Tune the motherboard firmware too',
    inherits: 'Premium',
    pages: ['Unlock BIOS tweaks', 'Advanced interrupt tuning'],
    perks: ['Every tweak, advanced ones included', 'Priority access to new tweaks', 'Personal help to set up your PC'],
    ai: 20,
  },
];

// Tweaks each plan can enable in the app (unlag/src/data.js FREE_TWEAKS and tweakTier).
export const PLAN_TWEAKS = { free: 34, premium: 143, ultra: 160 };

// Pricing comparison, in the order of the app's sidebar
export const PLAN_MATRIX = [
  ['Home', 'free'],
  ['General', 'free'],
  ['Privacy', 'free'],
  ['Cleaner', 'free'],
  ['Debloat', 'free'],
  ['Backups', 'free'],
  ['Performance', 'premium'],
  ['Game Mode', 'premium'],
  ['Network', 'premium'],
  ['BIOS', 'ultra'],
  ['Advanced', 'ultra'],
  ['Essential tweaks', 'free'],
  ['Moderate tweaks', 'premium'],
  ['Advanced tweaks', 'ultra'],
  ['Priority support', 'premium'],
  ['Priority access to new tweaks', 'ultra'],
  ['Personal help', 'ultra'],
];

export const FAQ = [
  {
    group: 'Safety',
    items: [
      {
        q: 'Can I undo a tweak',
        a: 'Yes. Before writing anything, Unlag reads the current values and stores them in %ProgramData%\\unlag\\tweaks.json. Turning the tweak off writes them back exactly, or deletes the key if it did not exist. The Backups page can also create Windows System Restore points.',
      },
      {
        q: 'Why does Unlag need administrator rights',
        a: 'Tweaks change the system registry, services and power plans. Without administrator rights the Unlag engine refuses every system change.',
      },
      {
        q: 'What do Safe, Moderate and Advanced mean',
        a: 'Each tweak carries a risk level. Safe tweaks fit almost every PC. Moderate ones can change how a feature behaves, like removing the notification center. Advanced ones are for people who know what the setting does. Tweaks marked as recommended are safe for most gaming PCs.',
      },
      {
        q: 'Is the BIOS module risky',
        a: 'It writes firmware settings through AMI SCEWIN on compatible motherboards. It is the most advanced module and only comes with Ultimate. Write down your current settings before you use it.',
      },
    ],
  },
  {
    group: 'Compatibility',
    items: [
      {
        q: 'Does it work on Windows 10',
        a: 'Yes, Windows 10 and Windows 11, 64-bit. A few tweaks, like the classic context menu or Recall, only apply to Windows 11.',
      },
      {
        q: 'Do some tweaks need a restart',
        a: 'A few do. They are marked in the app before you apply them.',
      },
    ],
  },
  {
    group: 'Account and plans',
    items: [
      {
        q: 'Do I need an account',
        a: 'Yes. You sign in with email, Google or Discord, on this site or in the app. It is the same account. Your preferences and assistant history stay on your PC.',
      },
      {
        q: 'Can I use my plan on two PCs',
        a: 'No. A Premium or Ultimate plan works on one PC, recognized by its motherboard. Reinstalling Windows does not change that, the PC is still recognized.',
      },
      {
        q: 'How many assistant messages do I get',
        a: '3 a day on Free, 7 on Premium and 20 on Ultimate. A new day starts at midnight, Paris time.',
      },
    ],
  },
];
