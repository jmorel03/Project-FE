import { Link } from 'react-router-dom';
import { CheckCircleIcon, DocumentTextIcon, CreditCardIcon, ReceiptPercentIcon } from '@heroicons/react/24/solid';
import PublicNav from '../components/layout/PublicNav';

const features = [
  {
    name: 'Professional Invoices',
    description: 'Create and send beautiful invoices in seconds. Track payment status in real-time.',
    icon: DocumentTextIcon,
  },
  {
    name: 'Expense Tracking',
    description: 'Log expenses with receipts. Categorize and analyze spending patterns effortlessly.',
    icon: ReceiptPercentIcon,
  },
  {
    name: 'Client Management',
    description: 'Keep all your client information organized. Never lose important contact details.',
    icon: CreditCardIcon,
  },
  {
    name: 'Payment Recording',
    description: 'Track partial and full payments. Get insights into your cash flow and outstanding invoices.',
    icon: CheckCircleIcon,
  },
];

export default function Landing() {
  return (
    <div className="marketing-shell relative overflow-hidden">
      <div className="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-16 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <PublicNav />

      {/* Hero Section */}
      <section className="pt-24 pb-20">
        <div className="marketing-wrap text-center">
          <span className="hero-chip mb-6">Invoice and expense management in one place</span>
          <h1 className="text-4xl leading-tight sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6">
            Run invoicing and expenses
            <span className="block text-primary-600">from a single dashboard.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Xpensist helps you create invoices, manage clients, record payments, and track expenses with receipt uploads. It is built for straightforward day-to-day operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition inline-block shadow-lg shadow-primary-200"
            >
              Start Free Today
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:border-slate-400 transition inline-block"
            >
              Sign In
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-4">Use your account to create clients, invoices, and expenses immediately.</p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              ['Invoices', 'Create, send, and track status'],
              ['Expenses', 'Categorize costs and upload receipts'],
              ['Dashboard', 'Review revenue and activity'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
                <p className="text-lg font-extrabold text-slate-900">{value}</p>
                <p className="text-sm text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="marketing-wrap">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-3">
            Core Capabilities
          </h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            The current platform focuses on practical essentials: invoice workflows, client records, expense tracking, and payment visibility.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {features.map(({ name, description, icon: Icon }) => (
              <div key={name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 hover:bg-white hover:shadow-lg transition">
                <div className="mb-4 inline-flex rounded-xl bg-primary-100 p-3">
                  <Icon className="w-7 h-7 text-primary-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{name}</h3>
                <p className="text-slate-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Summary */}
      <section className="py-14">
        <div className="marketing-wrap">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold tracking-wide text-slate-500 text-center mb-3">CURRENT PRODUCT SCOPE</p>
            <p className="mx-auto max-w-3xl text-center text-slate-600 leading-relaxed">
              Xpensist currently includes authentication, client management, invoice creation and tracking, payment recording,
              expense categories, receipt uploads, and dashboard reporting. Additional subscription billing and advanced billing
              automation can be introduced as next-stage features.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="marketing-wrap text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to simplify your invoicing?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Start with the current core workflow: clients, invoices, expenses, and reporting.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p>&copy; 2026 Xpensist. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
