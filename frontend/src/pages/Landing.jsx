import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  BellAlertIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/solid';
import PublicFooter from '../components/layout/PublicFooter';
import PublicNav from '../components/layout/PublicNav';
import useDocumentTitle from '../hooks/useDocumentTitle';

const featureCards = [
  {
    name: 'Professional Invoices',
    description: 'Create, send, and update invoices with payment tracking and downloadable PDFs.',
    icon: DocumentTextIcon,
  },
  {
    name: 'Email Delivery Built In',
    description: 'Send invoices directly to clients from inside the app and keep follow-up centralized.',
    icon: EnvelopeIcon,
  },
  {
    name: 'Reminder Workflows',
    description: 'Send due-soon and overdue reminders instead of manually chasing every client.',
    icon: BellAlertIcon,
  },
  {
    name: 'Expense Visibility',
    description: 'Capture spending with categories, receipt uploads, and clearer monthly reporting.',
    icon: ReceiptPercentIcon,
  },
  {
    name: 'Client Operating System',
    description: 'Keep client history, invoice status, and collections context in one place.',
    icon: UserGroupIcon,
  },
  {
    name: 'Income, Expense, and Profit Dashboard',
    description: 'See money in, money out, and net profit with trend tracking and actionable follow-up queues.',
    icon: ChartBarSquareIcon,
  },
  {
    name: 'Multi-Currency Ready',
    description: 'Set your default account currency and keep reporting aligned with how you run your business.',
    icon: BanknotesIcon,
  },
  {
    name: 'Security and Account Controls',
    description: 'Use secure authentication, password updates, and reset flows that protect billing operations.',
    icon: ShieldCheckIcon,
  },
];

const workflowSteps = [
  ['Add your client', 'Store contact details once, then reuse them across every invoice and follow-up.'],
  ['Send the invoice', 'Deliver a clean PDF and track when the invoice moves from draft to sent to paid.'],
  ['Stay ahead of due dates', 'Use reminders and dashboard follow-up queues to prevent revenue from going stale.'],
  ['Close the loop', 'Record payment, update reporting, and keep cash flow visibility current.'],
];

export default function Landing() {
  useDocumentTitle('Xpensist');

  return (
    <div className="marketing-shell marketing-reveal overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.15),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_44%,_#f8fafc_100%)]">
      <PublicNav />

      <section className="relative pt-24 pb-20">
        <div className="pointer-events-none absolute -top-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="marketing-wrap relative">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="hero-chip mb-6">Finance operations infrastructure for modern service businesses</span>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                A control center for billing operations, cash flow, and financial visibility.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Xpensist unifies invoicing, expense management, and collections workflows into one reliable operating layer so teams can scale without sacrificing financial control.
              </p>
              <p className="mt-3 max-w-2xl text-base font-semibold text-slate-800 sm:text-lg">
                Track your income, expenses, and profit in one simple dashboard.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Free forever starter plan
                </span>
                <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-700">
                  14-day free trial on professional
                </span>
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/register?plan=starter" className="rounded-xl bg-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-200 transition hover:-translate-y-0.5 hover:bg-primary-700">
                  Start Free Today
                </Link>
                <Link to="/pricing" className="rounded-xl border border-slate-300 bg-white/90 px-8 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400">
                  See Plans
                </Link>
              </div>

              <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
                {[
                  ['Invoices', 'Standardized creation, delivery, and payment tracking'],
                  ['Reminders', 'Automated due-soon and overdue workflows'],
                  ['Reporting', 'Real-time income, expense, and profit visibility'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
                    <p className="text-lg font-extrabold text-slate-900">{value}</p>
                    <p className="text-sm text-slate-600">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-slate-900 p-6 text-white shadow-2xl">
              <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Collections Snapshot</p>
                    <h2 className="mt-2 text-2xl font-bold">Move from reactive to deliberate.</h2>
                  </div>
                  <ChartBarSquareIcon className="h-8 w-8 text-emerald-300" />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-4 text-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Due Soon</p>
                    <p className="mt-2 text-3xl font-black">04</p>
                    <p className="mt-1 text-sm text-slate-500">Invoices worth following up before they go stale.</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-400 px-4 py-4 text-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-700">Forecast</p>
                    <p className="mt-2 text-3xl font-black">$12.4k</p>
                    <p className="mt-1 text-sm text-slate-700">Expected collections over the next 30 days.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">At-risk invoices</span>
                    <span className="font-semibold text-white">2 need action now</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-2 w-2/3 rounded-full bg-emerald-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="marketing-wrap grid gap-4 rounded-[28px] border border-slate-200 bg-white/92 px-6 py-6 shadow-sm backdrop-blur md:grid-cols-4">
          {[
            ['Collections Discipline', 'Automated follow-up queues reduce revenue leakage'],
            ['Executive Visibility', 'Revenue, expenses, and payment activity in a single view'],
            ['Operational Clarity', 'Built for teams that need fast, accurate decisions'],
            ['Governance Ready', 'Secure access, structured records, and policy-minded workflows'],
          ].map(([title, text]) => (
            <div key={title}>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-900">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-10">
        <div className="marketing-wrap grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Starter</p>
            <p className="mt-2 text-3xl font-black text-slate-900">$0</p>
            <p className="mt-1 text-sm text-slate-600">Free forever. Ideal for implementing core billing workflows.</p>
          </div>
          <div className="rounded-2xl border border-primary-200 bg-primary-50/80 px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">Professional</p>
            <p className="mt-2 text-3xl font-black text-slate-900">$29/mo</p>
            <p className="mt-1 text-sm text-slate-600">Includes a 14-day trial for teams ready to automate collections.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Business</p>
            <p className="mt-2 text-3xl font-black text-slate-900">$79/mo</p>
            <p className="mt-1 text-sm text-slate-600">Advanced controls and support for scaling finance operations.</p>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="marketing-wrap">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-700">Core Platform</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Everything required to run billing as an accountable system.</h2>
            <p className="mt-4 text-lg text-slate-600">The platform supports the full cycle: invoice creation and delivery, collections follow-up, receipt-backed expenses, income/expense/profit reporting, multi-currency settings, and secure account controls.</p>
          </div>

          <div className="mt-10 grid gap-7 md:grid-cols-2">
            {featureCards.map(({ name, description, icon: Icon }) => (
              <div key={name} className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="inline-flex rounded-2xl bg-primary-100 p-3 text-primary-700">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">{name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white py-20">
        <div className="marketing-wrap grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">A workflow designed for consistency, not heroics.</h2>
            <p className="mt-4 text-lg text-slate-600">Xpensist creates a repeatable operational cadence so billing outcomes do not depend on manual memory.</p>
          </div>
          <div className="space-y-4">
            {workflowSteps.map(([title, text], index) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm transition hover:border-slate-300">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-700">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="marketing-wrap grid gap-8 lg:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <ShieldCheckIcon className="h-8 w-8 text-emerald-600" />
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Built for trust</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Secure authentication, structured records, and dependable account controls create the confidence expected from financial software.</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <BanknotesIcon className="h-8 w-8 text-primary-600" />
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Built for collections</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">The dashboard surfaces due-soon, overdue, and at-risk invoices so follow-up is proactive, measurable, and repeatable.</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <CheckCircleIcon className="h-8 w-8 text-cyan-600" />
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Built to grow with you</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Start with core invoicing and expense controls, then expand into deeper automation, analytics, and support as complexity grows.</p>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="marketing-wrap rounded-[32px] bg-primary-600 px-8 py-12 text-center text-white shadow-xl shadow-primary-200">
          <h2 className="text-3xl font-bold sm:text-4xl">Run finance operations with confidence at every stage.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">Standardize invoicing, strengthen collections, and lead with dashboard-level clarity on what needs action next.</p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/register?plan=starter" className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-primary-700 transition hover:-translate-y-0.5 hover:bg-slate-100">
              Create Free Account
            </Link>
            <Link to="/pricing" className="rounded-xl border border-white/40 px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">
              Compare Plans
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
