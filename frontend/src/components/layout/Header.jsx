import { Menu } from '@headlessui/react';
import { ChevronDownIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-slate-200/80 bg-white/82 px-6 backdrop-blur">
      <div className="flex h-full items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          <p className="text-sm font-semibold text-slate-700">Financial Operations</p>
        </div>

        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <span className="hidden sm:block">{user?.firstName} {user?.lastName}</span>
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          </Menu.Button>

          <Menu.Items className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl focus:outline-none">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => navigate('/settings')}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm ${active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}
                  >
                    <UserCircleIcon className="h-4 w-4" />
                    Profile and Settings
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 ${active ? 'bg-red-50' : ''}`}
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    Sign Out
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      </div>
    </header>
  );
}
