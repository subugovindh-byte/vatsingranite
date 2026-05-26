import { useState, useEffect, useRef, type ReactElement } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useThemeStore, useToastStore } from './store';
import { apiClient } from './utils/api';
import { ToastContainer } from './components/ToastContainer';
import {
  DashboardIcon,
  BuildingsIcon,
  GrowthIcon,
  TargetIcon,
  GridIcon,
  ScalesIcon,
  DevicesIcon,
  MaintenanceIcon,
  ToteIcon,
  CurrencyIcon,
  GlobeIcon,
  ReceiptIcon,
  TravelIcon,
  CalculatorIcon,
  PercentageIcon,
  BankIcon,
  PolicyIcon,
  ChartBarIcon,
  UserGroupIcon,
  CurrencyExchangeIcon,
  ProtectionIcon,
  MedicalKitIcon,
  SignatureIcon,
  UserAdminIcon,
  DatabaseIcon,
  ExportIcon,
  ChevronDownIcon,
  GuideOpenIcon,
} from '@salt-ds/icons';

/* ── Pages ── */
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QuarriesPage from './pages/QuarriesPage';
import ProductionPage from './pages/ProductionPage';
import BlastingPage from './pages/BlastingPage';
import BlocksPage from './pages/BlocksPage';
import WeighbridgePage from './pages/WeighbridgePage';
import MachineryPage from './pages/MachineryPage';
import MaintenancePage from './pages/MaintenancePage';
import ConsumablesPage from './pages/ConsumablesPage';
import SalesPage from './pages/SalesPage';
import ExportSalesPage from './pages/ExportSalesPage';
import InvoicesPage from './pages/InvoicesPage';
import EWayBillPage from './pages/EWayBillPage';
import AccountsPage from './pages/AccountsPage';
import GSTPage from './pages/GSTPage';
import BankingPage from './pages/BankingPage';
import RoyaltyPage from './pages/RoyaltyPage';
import ReportsPage from './pages/ReportsPage';
import EmployeesPage from './pages/EmployeesPage';
import PayrollPage from './pages/PayrollPage';
import CompliancePage from './pages/CompliancePage';
import SafetyPage from './pages/SafetyPage';
import PermitsPage from './pages/PermitsPage';
import UsersPage from './pages/UsersPage';
import MastersPage from './pages/MastersPage';
import BlockPhotosPage from './pages/BlockPhotosPage';
import QuarryPhotosPage from './pages/QuarryPhotosPage';
import SetupWizardPage from './pages/SetupWizardPage';
import HelpPage from './pages/HelpPage';

interface NavItem {
  sec?: string;
  id?: string;
  path?: string;
  lbl?: string;
  icon?: ReactElement;
}

interface NavGroup {
  sec: string;
  items: NavItem[];
}

function buildGroups(nav: NavItem[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const item of nav) {
    if (item.sec) groups.push({ sec: item.sec, items: [] });
    else groups[groups.length - 1]?.items.push(item);
  }
  return groups;
}

const NAV: NavItem[] = [
  { sec: 'Daily Ops' },
  { id: 'dashboard',   path: '/dashboard',   lbl: 'Dashboard',    icon: <DashboardIcon />        },
  { id: 'production',  path: '/production',   lbl: 'Production',   icon: <GrowthIcon />           },
  { id: 'blasting',    path: '/blasting',     lbl: 'Blasting',     icon: <TargetIcon />           },
  { id: 'weighbridge', path: '/weighbridge',  lbl: 'Weighbridge',  icon: <ScalesIcon />           },

  { sec: 'Quarry & Blocks' },
  { id: 'quarries',    path: '/quarries',     lbl: 'Quarries',     icon: <BuildingsIcon />        },
  { id: 'blocks',      path: '/blocks',       lbl: 'Blocks',       icon: <GridIcon />             },

  { sec: 'Equipment' },
  { id: 'assets',      path: '/assets',       lbl: 'Assets',       icon: <DevicesIcon />          },
  { id: 'maintenance', path: '/maintenance',  lbl: 'Maintenance',  icon: <MaintenanceIcon />      },
  { id: 'consumables', path: '/consumables',  lbl: 'Consumables',  icon: <ToteIcon />             },

  { sec: 'Trade' },
  { id: 'sales',       path: '/sales',        lbl: 'Sales',        icon: <CurrencyIcon />         },
  { id: 'export',      path: '/export',       lbl: 'Export Sales', icon: <GlobeIcon />            },
  { id: 'invoices',    path: '/invoices',     lbl: 'Invoices',     icon: <ReceiptIcon />          },
  { id: 'ewaybill',    path: '/ewaybill',     lbl: 'E-Way Bill',   icon: <TravelIcon />           },

  { sec: 'Finance' },
  { id: 'accounts',    path: '/accounts',     lbl: 'Accounts',     icon: <CalculatorIcon />       },
  { id: 'banking',     path: '/banking',      lbl: 'Banking',      icon: <BankIcon />             },
  { id: 'royalty',     path: '/royalty',      lbl: 'Royalty',      icon: <PolicyIcon />           },
  { id: 'gst',         path: '/gst',          lbl: 'GST & Tax',    icon: <PercentageIcon />       },
  { id: 'reports',     path: '/reports',      lbl: 'Reports',      icon: <ChartBarIcon />         },

  { sec: 'People' },
  { id: 'employees',   path: '/employees',    lbl: 'Employees',    icon: <UserGroupIcon />        },
  { id: 'payroll',     path: '/payroll',      lbl: 'Payroll',      icon: <CurrencyExchangeIcon /> },

  { sec: 'Statutory' },
  { id: 'compliance',  path: '/compliance',   lbl: 'Mining',       icon: <ProtectionIcon />       },
  { id: 'safety',      path: '/safety',       lbl: 'Safety',       icon: <MedicalKitIcon />       },
  { id: 'permits',     path: '/permits',      lbl: 'Permits',      icon: <SignatureIcon />        },

  { sec: 'System' },
  { id: 'users',       path: '/users',        lbl: 'Users',        icon: <UserAdminIcon />        },
  { id: 'masters',     path: '/masters',      lbl: 'Masters',      icon: <DatabaseIcon />         },
  { id: 'help',        path: '/help',         lbl: 'Help',         icon: <GuideOpenIcon />        },
];

const NAV_GROUPS = buildGroups(NAV);

function formatDate() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function App() {
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const { notify } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(NAV_GROUPS.map(g => g.sec))
  );
  const setupChecked = useRef(false);

  const toggleGroup = (sec: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(sec) ? next.delete(sec) : next.add(sec);
      return next;
    });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // On first login, check if quarries exist. If not, redirect to setup wizard.
  useEffect(() => {
    if (!user || setupChecked.current || location.pathname === '/setup') return;
    setupChecked.current = true;
    apiClient.getQuarries()
      .then((q: any) => {
        const quarries = q.quarries ?? q;
        if (Array.isArray(quarries) && quarries.length === 0) {
          navigate('/setup', { replace: true });
        }
      })
      .catch(() => { /* ignore — user stays on current route */ });
  }, [user]);

  const handleLogout = () => {
    logout();
    notify('Signed out', 'success');
    navigate('/login');
  };

  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="nav-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <div>
            <div className="tb-brand"><span style={{ marginRight: '8px' }}>🏔️</span>Vatsin Granite ERP</div>
            <div className="tb-sub">Quarry Management Platform · FY 2025-26</div>
          </div>
        </div>
        <div className="tb-right">
          <span className="chip">{formatDate()}</span>
          <button className="theme-btn" onClick={toggle}>
            <span>{theme === 'dark' ? '☀' : '🌙'}</span>
            <span>{theme === 'dark' ? ' Day' : ' Night'}</span>
          </button>
        </div>
      </div>

      <div className={`nav-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />

      <div className="body-wrap">
        {/* ── Sidebar ── */}
        <div className={`sidebar${menuOpen ? ' open' : ''}`}>
          <div className="sb-user">
            <div className="sb-av">{(user.fullName?.[0] || user.username[0]).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sb-name">{user.fullName || user.username}</div>
              <div className="sb-role">{user.role || 'Admin'}</div>
            </div>
          </div>

          {NAV_GROUPS.map(({ sec, items }) => {
            const isCollapsed = collapsed.has(sec);
            return (
              <div key={sec}>
                <button
                  className={`sb-sec${isCollapsed ? ' sb-sec--collapsed' : ''}`}
                  onClick={() => toggleGroup(sec)}
                >
                  {sec}
                  <span className="sb-sec-chevron"><ChevronDownIcon /></span>
                </button>
                <div className={`sb-group-items${isCollapsed ? ' sb-group-items--closed' : ''}`}>
                  {items.map(item => (
                    <NavLink
                      key={item.id}
                      to={item.path!}
                      className={({ isActive }) => `sb-nav${isActive ? ' sb-nav-active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="sb-icon">{item.icon}</span>
                      <span>{item.lbl}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}

          <button className="sb-logout" onClick={handleLogout}>
            <span className="sb-icon"><ExportIcon /></span>
            <span>Sign Out</span>
          </button>
        </div>

        {/* ── Main ── */}
        <div className="main-content">
          <div className="main-scroll">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"   element={<DashboardPage />} />
              <Route path="/quarries"    element={<QuarriesPage />} />
              <Route path="/production"  element={<ProductionPage />} />
              <Route path="/blasting"    element={<BlastingPage />} />
              <Route path="/blocks"      element={<BlocksPage />} />
              <Route path="/weighbridge" element={<WeighbridgePage />} />
              <Route path="/assets"      element={<MachineryPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/consumables" element={<ConsumablesPage />} />
              <Route path="/sales"       element={<SalesPage />} />
              <Route path="/export"      element={<ExportSalesPage />} />
              <Route path="/invoices"    element={<InvoicesPage />} />
              <Route path="/ewaybill"    element={<EWayBillPage />} />
              <Route path="/accounts"    element={<AccountsPage />} />
              <Route path="/gst"         element={<GSTPage />} />
              <Route path="/banking"     element={<BankingPage />} />
              <Route path="/royalty"     element={<RoyaltyPage />} />
              <Route path="/reports"     element={<ReportsPage />} />
              <Route path="/employees"   element={<EmployeesPage />} />
              <Route path="/payroll"     element={<PayrollPage />} />
              <Route path="/compliance"  element={<CompliancePage />} />
              <Route path="/safety"      element={<SafetyPage />} />
              <Route path="/permits"     element={<PermitsPage />} />
              <Route path="/users"                    element={<UsersPage />} />
              <Route path="/masters"                  element={<MastersPage />} />
              <Route path="/help"                     element={<HelpPage />} />
              <Route path="/setup"                    element={<SetupWizardPage />} />
              <Route path="/blocks/:id/photos"        element={<BlockPhotosPage />} />
              <Route path="/quarries/:id/photos"      element={<QuarryPhotosPage />} />
              <Route path="*"                         element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
          <footer className="app-footer">
            <div className="app-footer__brand">Vatsin Granite Quarry</div>
            <div className="app-footer__meta">Integrated Quarry ERP · HSN 2516 · DGMS · IBM · TNMMCR</div>
          </footer>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}
