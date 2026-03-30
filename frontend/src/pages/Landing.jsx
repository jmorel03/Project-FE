import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  BellAlertIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/solid';
import PublicNav from '../components/layout/PublicNav';
import useDocumentTitle from '../hooks/useDocumentTitle';

const featureCards = [
  {
    name: 'Professional Invoices',
    description: 'Create, send, and update invoices with payment tracking and downloadable PDFs.',
    icon: DocumentTextIcon,
  },
  {
    name: 'Reminder Workflows',
    description: 'Send due-soon and overdue reminders instead of manually chasing every client.',
    icon: BellAlertIcon,
  },
  {
    name: 'Expense Visibility',
    description: 'Capture spending with categories, receipts, and clearer monthly reporting.',
    icon: ReceiptPercentIcon,
  },
  {
    name: 'Client Operating System',
    description: 'Keep client history, invoice status, and collections context in one place.',
    icon: UserGroupIcon,
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
              <span className="hero-chip mb-6">From first invoice to paid invoice, without the spreadsheet drift</span>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                The billing cockpit for freelancers and operators who hate chasing money.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Xpensist combines invoicing, expense tracking, reminders, and dashboard guidance so the admin side of your business stops stealing attention from the actual work.
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
                  ['Invoices', 'Create and track collections'],
                  ['Reminders', 'Stay ahead of due dates'],
                  ['Reporting', 'See revenue and spend clearly'],
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
            ['Faster Collections', 'Reminder workflows and follow-up visibility'],
            ['Cleaner Reporting', 'Revenue, expenses, and payment activity in one place'],
            ['Operator-Friendly UX', 'Built for small teams that need clarity fast'],
            ['Trust by Design', 'Professional invoices, secure auth, and structured records'],
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
            <p className="mt-1 text-sm text-slate-600">Free forever. Great for getting your invoicing system in place.</p>
          </div>
          <div className="rounded-2xl border border-primary-200 bg-primary-50/80 px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">Professional</p>
            <p className="mt-2 text-3xl font-black text-slate-900">$29/mo</p>
            <p className="mt-1 text-sm text-slate-600">Includes a 14-day free trial before billing starts.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Business</p>
            <p className="mt-2 text-3xl font-black text-slate-900">$79/mo</p>
            <p className="mt-1 text-sm text-slate-600">Premium controls and support for scaling teams.</p>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="marketing-wrap">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-700">Core Platform</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Everything needed to move work from draft to paid.</h2>
            <p className="mt-4 text-lg text-slate-600">The current product focuses on the jobs that directly affect cash flow: invoice creation, reminders, payment tracking, client history, and expense visibility.</p>
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
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">A better operating rhythm than create, forget, chase, repeat.</h2>
            <p className="mt-4 text-lg text-slate-600">Xpensist is most valuable when it keeps the boring but important work from falling through the cracks.</p>
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
            <p className="mt-3 text-sm leading-7 text-slate-600">Secure authentication, structured invoice records, and support-ready contact flows create the baseline confidence people expect from a finance tool.</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <BanknotesIcon className="h-8 w-8 text-primary-600" />
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Built for collections</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">The dashboard now surfaces due-soon, overdue, and at-risk invoices so follow-up becomes a planned routine instead of reactive cleanup.</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <CheckCircleIcon className="h-8 w-8 text-cyan-600" />
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Built to grow with you</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Start with invoicing and expenses. Add subscription upgrades when your operation needs stronger reminders, analytics, and support.</p>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="marketing-wrap rounded-[32px] bg-primary-600 px-8 py-12 text-center text-white shadow-xl shadow-primary-200">
          <h2 className="text-3xl font-bold sm:text-4xl">Run the admin side of the business like it matters.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">Create invoices, track expenses, follow up on payments, and give yourself a dashboard that actually tells you what to do next.</p>
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

      <footer className="bg-slate-900 px-4 py-8 text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p>&copy; 2026 Xpensist. Invoicing and expense operations, without the spreadsheet drift.</p>
        </div>
      </footer>
    </div>
  );
}
