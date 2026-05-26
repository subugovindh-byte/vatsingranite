/**
 * Centralized Icon System
 * Conceptual icons for consistent UI across the application
 */

export const Icons = {
  // Core Business
  quarry: '⛏️',
  block: '🗿',
  granite: '💎',
  mountain: '🏔️',
  mine: '⛰️',
  
  // Production & Operations
  blast: '💥',
  cutting: '✂️',
  polishing: '✨',
  drilling: '🔨',
  crane: '🏗️',
  truck: '🚛',
  forklift: '🏭',
  production: '⚙️',
  machine: '🔧',
  
  // Sales & Commerce
  sales: '💰',
  order: '📋',
  invoice: '🧾',
  payment: '💳',
  delivery: '📦',
  shipping: '🚚',
  cart: '🛒',
  receipt: '🧾',
  
  // Finance & Accounting
  finance: '💵',
  accounting: '📊',
  ledger: '📒',
  voucher: '📄',
  bank: '🏦',
  tax: '💸',
  royalty: '👑',
  budget: '💰',
  
  // Inventory & Materials
  inventory: '📦',
  stock: '📊',
  warehouse: '🏪',
  materials: '🧱',
  variety: '🎨',
  grade: '⭐',
  
  // Human Resources
  employee: '👷',
  team: '👥',
  attendance: '📅',
  payroll: '💵',
  shift: '🕐',
  contractor: '👔',
  
  // Safety & Compliance
  safety: '🦺',
  helmet: '⛑️',
  warning: '⚠️',
  incident: '🚨',
  permit: '📜',
  certificate: '📃',
  inspection: '🔍',
  compliance: '✅',
  
  // Documents & Reports
  document: '📄',
  report: '📊',
  chart: '📈',
  analytics: '📉',
  pdf: '📕',
  excel: '📗',
  file: '📁',
  
  // Status & Actions
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  pending: '⏳',
  processing: '⚙️',
  completed: '✔️',
  cancelled: '🚫',
  
  // Navigation & UI
  dashboard: '📊',
  home: '🏠',
  menu: '☰',
  settings: '⚙️',
  search: '🔍',
  filter: '🔽',
  sort: '🔀',
  refresh: '🔄',
  add: '➕',
  edit: '✏️',
  delete: '🗑️',
  save: '💾',
  print: '🖨️',
  download: '⬇️',
  upload: '⬆️',
  expand: '➕',
  collapse: '➖',
  
  // Users & Authentication
  user: '👤',
  profile: '👤',
  login: '🔑',
  logout: '🚪',
  password: '🔒',
  security: '🔐',
  
  // Communication
  notification: '🔔',
  message: '💬',
  email: '📧',
  phone: '📞',
  sms: '📱',
  
  // Location & Geography
  location: '📍',
  map: '🗺️',
  gps: '📍',
  address: '🏢',
  
  // Date & Time
  calendar: '📅',
  date: '📆',
  time: '🕐',
  clock: '⏰',
  
  // Quality & Rating
  star: '⭐',
  quality: '💯',
  approved: '👍',
  rejected: '👎',
  
  // Weather & Environment
  sun: '☀️',
  rain: '🌧️',
  weather: '🌤️',
  
  // Media & Photos
  camera: '📷',
  photo: '🖼️',
  gallery: '🎬',
  image: '🌄',
  video: '📹',
  
  // Tags & Labels
  tag: '🏷️',
  label: '📛',
  
  // Misc
  lock: '🔒',
  unlock: '🔓',
  link: '🔗',
  flag: '🚩',
  bookmark: '🔖',
  pin: '📌',
  bell: '🔔',
} as const;

export type IconKey = keyof typeof Icons;

/**
 * Get icon by key with fallback
 */
export const getIcon = (key: IconKey, fallback: string = '📋'): string => {
  return Icons[key] || fallback;
};

/**
 * Icon categories for UI organization
 */
export const IconCategories = {
  business: ['quarry', 'block', 'granite', 'mountain', 'mine'],
  production: ['blast', 'cutting', 'polishing', 'drilling', 'crane', 'truck'],
  sales: ['sales', 'order', 'invoice', 'payment', 'delivery'],
  finance: ['finance', 'accounting', 'ledger', 'voucher', 'bank', 'tax'],
  hr: ['employee', 'team', 'attendance', 'payroll', 'shift'],
  safety: ['safety', 'helmet', 'warning', 'incident', 'permit'],
  status: ['success', 'error', 'warning', 'info', 'pending', 'completed'],
  actions: ['add', 'edit', 'delete', 'save', 'print', 'refresh'],
} as const;

/**
 * Status icon mapping
 */
export const StatusIcons = {
  available: Icons.success,
  reserved: Icons.pending,
  sold: Icons.completed,
  dispatched: Icons.truck,
  draft: Icons.pending,
  confirmed: Icons.approved,
  in_progress: Icons.processing,
  completed: Icons.completed,
  cancelled: Icons.cancelled,
  active: Icons.success,
  inactive: Icons.warning,
  pending: Icons.pending,
} as const;

/**
 * Get status icon by status value
 */
export const getStatusIcon = (status: string): string => {
  return StatusIcons[status as keyof typeof StatusIcons] || Icons.info;
};
