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
    <header className="h-16 flex items-center justify-end px-6 bg-white border-b border-gray-200 shrink-0">
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <span className="hidden sm:block">{user?.firstName} {user?.lastName}</span>
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        </Menu.Button>

        <Menu.Items className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg ring-1 ring-gray-200 focus:outline-none z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => navigate('/settings')}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm ${active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  <UserCircleIcon className="w-4 h-4" />
                  Profile & Settings
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 ${active ? 'bg-red-50' : ''}`}
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Menu>
    </header>
  );
}
