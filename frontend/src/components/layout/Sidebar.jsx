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
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-gray-200 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <DocumentTextIcon className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">InvoiceFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom branding */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">InvoiceFlow v1.0</p>
      </div>
    </aside>
  );
}
