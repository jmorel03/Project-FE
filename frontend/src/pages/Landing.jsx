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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PublicNav />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Manage Invoices & Expenses
            <span className="block text-primary-600">With Confidence</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Xpensist is the all-in-one platform for freelancers and small businesses to create professional invoices, 
            track expenses, and manage cash flow—all from one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition inline-block"
            >
              Start Free Today
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 transition inline-block"
            >
              Sign In
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required. Start in seconds.</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map(({ name, description, icon: Icon }) => (
              <div key={name} className="p-6 rounded-lg border border-gray-200 hover:shadow-lg transition">
                <Icon className="w-12 h-12 text-primary-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{name}</h3>
                <p className="text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold text-primary-600">10K+</p>
            <p className="text-gray-600 mt-2">Active Users</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-primary-600">$500M+</p>
            <p className="text-gray-600 mt-2">Invoiced</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-primary-600">99.9%</p>
            <p className="text-gray-600 mt-2">Uptime</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to simplify your invoicing?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of freelancers and small business owners already using Xpensist.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p>&copy; 2026 Xpensist. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
