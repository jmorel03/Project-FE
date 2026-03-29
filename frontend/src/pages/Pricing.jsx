import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckIcon } from '@heroicons/react/24/solid';
import PublicNav from '../components/layout/PublicNav';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { billingService } from '../services/api';

const fallbackPlans = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'For solo operators getting their system in place.',
    amount: 0,
    currency: 'usd',
    interval: 'month',
    isFree: true,
    cta: 'Start Free',
    perks: ['Up to 5 invoices per month', 'Basic client and expense tracking', 'PDF invoice export', 'Email support'],
    limits: { invoices: '5 / month', teamMembers: '1 seat', automation: 'Manual only', reporting: 'Basic' },
  },
  {
    key: 'professional',
    name: 'Professional',
    description: 'For growing freelancers and service businesses.',
    amount: 2900,
    currency: 'usd',
    interval: 'month',
    isFree: false,
    cta: 'Upgrade to Professional',
    perks: ['Unlimited invoices and clients', 'Automatic invoice reminder workflows', 'Advanced dashboard insights', 'Priority support', 'Receipt uploads and organization'],
    limits: { invoices: 'Unlimited', teamMembers: '1 seat', automation: 'Reminders and workflows', reporting: 'Advanced' },
  },
  {
    key: 'business',
    name: 'Business',
    description: 'For operators who need admin control and premium support.',
    amount: 7900,
    currency: 'usd',
    interval: 'month',
    isFree: false,
    cta: 'Upgrade to Business',
    perks: ['Everything in Professional', 'Priority onboarding support', 'Higher-touch billing operations', 'Shared finance workflows', 'Future-ready for team expansion'],
    limits: { invoices: 'Unlimited', teamMembers: 'Up to 5 seats', automation: 'Advanced', reporting: 'Executive' },
  },
];

const comparisonRows = [
  { label: 'Invoices', key: 'invoices' },
  { label: 'Team Members', key: 'teamMembers' },
  { label: 'Automation', key: 'automation' },
  { label: 'Reporting', key: 'reporting' },
];

function formatMoney(amount, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency).toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export default function Pricing() {
  useDocumentTitle('Xpensist | Pricing');

  const [annualBilling, setAnnualBilling] = useState(false);
  const [monthlyInvoices, setMonthlyInvoices] = useState(18);
  const { data } = useQuery({ queryKey: ['public-billing-plans'], queryFn: billingService.getPublicPlans });

  const plans = data?.plans?.length ? data.plans : fallbackPlans;
  const annualSavings = (plan) => (plan.isFree ? 0 : Math.round(plan.amount * 12 * 0.2));
  const yearlyCost = (plan) => (plan.isFree ? 0 : Math.round(plan.amount * 12 * 0.8));
  const hoursSaved = Math.round(monthlyInvoices * 0.6);
  const recoveredRevenue = monthlyInvoices * 45;

  return (
    <div className="marketing-shell bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_38%,_#f8fafc_100%)]">
      <PublicNav />

      <section className="pt-24 pb-14">
        <div className="marketing-wrap text-center">
          <span className="hero-chip mb-5">Pricing built around faster collections and cleaner operations</span>
          <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Choose the tier that matches your admin load, not just your headcount.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">
            The free plan gets the fundamentals in place. Paid plans unlock automated reminders, stronger analytics, and higher-touch billing workflows.
          </p>

          <div className="mt-8 inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${annualBilling ? 'text-slate-500' : 'bg-slate-900 text-white'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${annualBilling ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}
            >
              Annual
            </button>
            <span className="px-3 text-xs font-bold uppercase tracking-wide text-emerald-700">Save 20%</span>
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="marketing-wrap grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
            const highlighted = plan.key === 'professional';
            const displayPrice = annualBilling ? yearlyCost(plan) : plan.amount;

            return (
              <div
                key={plan.key}
                className={`rounded-[28px] border p-8 transition ${highlighted ? 'border-primary-300 bg-slate-900 text-white shadow-2xl' : 'border-slate-200 bg-white shadow-sm'}`}
              >
                {highlighted && (
                  <span className="mb-4 inline-flex rounded-full bg-emerald-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-900">
                    Best conversion path
                  </span>
                )}
                <h2 className={`text-2xl font-bold ${highlighted ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h2>
                <p className={`mt-2 text-sm ${highlighted ? 'text-slate-300' : 'text-slate-600'}`}>{plan.description}</p>

                <div className="mt-6">
                  <p className={`text-5xl font-black tracking-tight ${highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.isFree ? 'Free' : formatMoney(displayPrice, plan.currency)}
                  </p>
                  <p className={`mt-2 text-sm ${highlighted ? 'text-slate-300' : 'text-slate-500'}`}>
                    {plan.isFree
                      ? 'Free forever for early-stage setup.'
                      : annualBilling
                        ? `Billed annually. Save ${formatMoney(annualSavings(plan), plan.currency)} each year.`
                        : `Billed ${plan.interval || 'monthly'}. Upgrade anytime.`}
                  </p>
                </div>

                <Link
                  to="/register"
                  className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                    highlighted ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {plan.cta || 'Get Started'}
                </Link>

                <div className="mt-8 space-y-4">
                  {plan.perks?.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckIcon className={`mt-0.5 h-5 w-5 shrink-0 ${highlighted ? 'text-emerald-300' : 'text-primary-600'}`} />
                      <span className={`text-sm ${highlighted ? 'text-slate-200' : 'text-slate-700'}`}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pb-16">
        <div className="marketing-wrap grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Plan Comparison</h2>
            <p className="mt-2 text-sm text-slate-600">The biggest jump in value is moving from manual follow-up to reminder automation and stronger operating visibility.</p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-500">Feature</th>
                    {plans.map((plan) => (
                      <th key={plan.key} className="px-5 py-3 font-semibold text-slate-900">{plan.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {comparisonRows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-5 py-4 font-medium text-slate-600">{row.label}</td>
                      {plans.map((plan) => (
                        <td key={`${plan.key}-${row.key}`} className="px-5 py-4 text-slate-800">{plan.limits?.[row.key] || 'Included'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-8 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">ROI Estimator</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">See what cleaner workflows are worth.</h2>
            <p className="mt-2 text-sm text-slate-600">This is a directional estimate based on faster admin handling and better reminder follow-up.</p>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Monthly invoices</span>
                <span>{monthlyInvoices}</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={monthlyInvoices}
                onChange={(event) => setMonthlyInvoices(Number(event.target.value))}
                className="mt-4 w-full accent-emerald-500"
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-900 p-4 text-white">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Estimated Hours Saved</p>
                  <p className="mt-2 text-3xl font-black">{hoursSaved} hrs</p>
                  <p className="mt-2 text-sm text-slate-300">Less admin drag from repeated manual follow-up.</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Potential Revenue Recovered</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">${recoveredRevenue.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-slate-500">Directional estimate from fewer late or forgotten invoices.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white py-16">
        <div className="marketing-wrap grid gap-8 md:grid-cols-3">
          {[
            ['Faster Collections', 'Automated reminders reduce the manual chasing that usually happens after invoices slip past due.'],
            ['Cleaner Operations', 'Onboarding checklists and dashboard guidance shorten the time between signup and first successful invoice.'],
            ['Stronger Retention', 'Perk-based plans make upgrading feel like an operations decision, not just a billing event.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="marketing-wrap text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Start with the workflow you have now, then grow into automation.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">You do not need enterprise complexity on day one. You do need invoicing, follow-up, and reporting that get sharper as the business grows.</p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/register" className="rounded-xl bg-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-200 transition hover:bg-primary-700">
              Create Free Account
            </Link>
            <Link to="/login" className="rounded-xl border border-slate-300 px-8 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 px-4 py-8 text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p>&copy; 2026 Xpensist. Built for operators who want cleaner billing.</p>
        </div>
      </footer>
    </div>
  );
}
