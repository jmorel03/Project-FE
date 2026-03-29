import { Link, NavLink } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-200/80 bg-white/88 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-emerald-300">X</span>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">Xpensist</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/pricing"
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              Pricing
            </NavLink>
            <a href="/#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Features
            </a>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary-200/70 transition hover:-translate-y-0.5 hover:bg-primary-700"
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden rounded-lg p-2 hover:bg-slate-100">
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="space-y-3 border-t border-slate-200 pb-4 md:hidden">
            <Link
              to="/"
              className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/pricing"
              className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <a
              href="/#features"
              className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <div className="space-y-2 border-t border-slate-200 px-4 pt-3">
              <Link to="/login" className="block rounded-xl px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-100">
                Login
              </Link>
              <Link
                to="/register"
                className="block rounded-xl bg-primary-600 px-4 py-2 text-center text-sm font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
