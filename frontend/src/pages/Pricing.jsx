import { Link } from 'react-router-dom';
import { CheckIcon } from '@heroicons/react/24/solid';
import PublicNav from '../components/layout/PublicNav';

const plans = [
  {
    name: 'Starter',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      'Up to 5 invoices per month',
      'Basic client management',
      'Expense tracking (basic)',
      'Email support',
      'Community access',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 29,
    description: 'Best for growing freelancers',
    features: [
      'Unlimited invoices',
      'Advanced client management',
      'Full expense tracking with receipts',
      'Payment recording',
      'Invoice templates',
      'Priority email support',
      'PDF invoice download',
      'Dashboard analytics',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: 79,
    description: 'For established businesses',
    features: [
      'Everything in Professional',
      'Team members (up to 5)',
      'Advanced reporting',
      'Custom branding',
      'API access',
      'Phone support',
      'Bulk operations',
      'Custom integrations',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <div className="marketing-shell">
      <PublicNav />

      {/* Hero */}
      <section className="pt-24 pb-12">
        <div className="marketing-wrap text-center">
          <span className="hero-chip mb-5">Plans for solo founders to scaling teams</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the perfect plan for your business. All plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="marketing-wrap">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl transition ${
                  plan.highlighted
                    ? 'bg-primary-600 text-white shadow-2xl md:scale-105 ring-4 ring-primary-100/70'
                    : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                <div className="p-8">
                  {/* Plan Header */}
                  {plan.highlighted && (
                    <span className="mb-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide text-white">
                      MOST POPULAR
                    </span>
                  )}
                  <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.name}
                  </h3>
                  <p
                    className={`text-sm mb-6 ${
                      plan.highlighted ? 'text-primary-100' : 'text-slate-600'
                    }`}
                  >
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    {plan.price > 0 && (
                      <span className={plan.highlighted ? 'text-primary-100' : 'text-slate-600'}>
                        /month
                      </span>
                    )}
                    {plan.price === 0 && (
                      <span className="text-sm text-slate-600">
                        {' '}
                        forever
                      </span>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Link
                    to="/register"
                    className={`block w-full py-3 px-4 rounded-lg font-semibold text-center mb-8 transition ${
                      plan.highlighted
                        ? 'bg-white text-primary-600 hover:bg-gray-100'
                        : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  {/* Features */}
                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckIcon
                          className={`w-5 h-5 flex-shrink-0 ${
                            plan.highlighted ? 'text-primary-100' : 'text-primary-600'
                          }`}
                        />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white border-y border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! Cancel your subscription anytime with no penalties or long-term commitments.',
              },
              {
                q: 'Do you offer discounts for annual billing?',
                a: 'Yes, save 20% when you prepay for a full year. Contact us for details.',
              },
              {
                q: 'Is there a free trial?',
                a: 'All paid plans include a 14-day free trial. No credit card required to start.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, PayPal, and bank transfers for business accounts.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-slate-200 p-5 bg-slate-50/70">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{q}</h3>
                <p className="text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start your free trial today
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            No credit card required. Full access to all features for 14 days.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Get Started
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
