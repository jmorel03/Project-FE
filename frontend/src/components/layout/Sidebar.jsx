import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  CreditCardIcon,
  UsersIcon,
  WalletIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
  { to: '/invoices', icon: DocumentTextIcon, label: 'Invoices' },
  { to: '/expenses', icon: CreditCardIcon, label: 'Expenses' },
  { to: '/clients', icon: UsersIcon, label: 'Clients' },
  { to: '/settings/subscription', icon: WalletIcon, label: 'Subscription' },
  { to: '/settings', icon: Cog6ToothIcon, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/88 backdrop-blur">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
          <DocumentTextIcon className="h-5 w-5 text-emerald-300" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">Xpensist</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Operations OS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom branding */}
      <div className="border-t border-slate-200 px-5 py-4">
        <p className="text-xs font-medium text-slate-500">Xpensist v1.0</p>
        <p className="mt-1 text-[11px] text-slate-400">Built for cleaner billing workflows</p>
      </div>
    </aside>
  );
}
