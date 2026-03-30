import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { dashboardService } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value, sub, color = 'primary', icon: Icon }) {
  const tones = {
    primary: 'text-primary-700 bg-primary-50 border-primary-100',
    green: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    red: 'text-red-700 bg-red-50 border-red-100',
    yellow: 'text-amber-700 bg-amber-50 border-amber-100',
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl border p-2 ${tones[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, label, value, detail, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-700 border-primary-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-600">{detail}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-2.5 shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

function formatDueLabel(daysUntilDue) {
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`;
  if (daysUntilDue === 0) return 'Due today';
  return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
}

function dueTone(daysUntilDue) {
  if (daysUntilDue < 0) return 'text-red-700 bg-red-50 border-red-100';
  if (daysUntilDue <= 2) return 'text-amber-700 bg-amber-50 border-amber-100';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

export default function Dashboard() {
  useDocumentTitle('Xpensist | Dashboard');
  const { user } = useAuth();

  const [hideChecklist, setHideChecklist] = useState(false);
  const [financeRange, setFinanceRange] = useState('month');
  const [dashboardMode, setDashboardMode] = useState('operator');

  const checklistPreferenceKey = user?.id
    ? `xpensist:dashboard:hideChecklist:${user.id}`
    : null;
  const dashboardModePreferenceKey = user?.id
    ? `xpensist:dashboard:mode:${user.id}`
    : null;

  useEffect(() => {
    if (!checklistPreferenceKey) {
      setHideChecklist(false);
      return;
    }
    setHideChecklist(localStorage.getItem(checklistPreferenceKey) === '1');
  }, [checklistPreferenceKey]);

  useEffect(() => {
    if (!dashboardModePreferenceKey) {
      setDashboardMode('operator');
      return;
    }
    const savedMode = localStorage.getItem(dashboardModePreferenceKey);
    setDashboardMode(savedMode === 'executive' ? 'executive' : 'operator');
  }, [dashboardModePreferenceKey]);

  function setChecklistHidden(nextHidden) {
    setHideChecklist(nextHidden);
    if (!checklistPreferenceKey) return;
    if (nextHidden) {
      localStorage.setItem(checklistPreferenceKey, '1');
    } else {
      localStorage.removeItem(checklistPreferenceKey);
    }
  }

  function updateDashboardMode(nextMode) {
    setDashboardMode(nextMode);
    if (!dashboardModePreferenceKey) return;
    if (nextMode === 'operator') {
      localStorage.removeItem(dashboardModePreferenceKey);
    } else {
      localStorage.setItem(dashboardModePreferenceKey, nextMode);
    }
  }

  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardService.stats });
  const financeQuery = useQuery({
    queryKey: ['dashboard-finance', financeRange],
    queryFn: () => dashboardService.finance({ range: financeRange }),
  });
  const revenueQuery = useQuery({ queryKey: ['dashboard-revenue'], queryFn: dashboardService.revenue });
  const activityQuery = useQuery({ queryKey: ['dashboard-activity'], queryFn: dashboardService.activity });
  const insightsQuery = useQuery({ queryKey: ['dashboard-insights'], queryFn: dashboardService.insights });

  const stats = statsQuery.data;
  const finance = financeQuery.data;
  const revenue = revenueQuery.data;
  const activity = activityQuery.data;
  const insights = insightsQuery.data;

  const checklist = insights?.checklist || [];
  const remainingChecklist = checklist.filter((item) => !item.complete);
  const completedChecklist = checklist.filter((item) => item.complete).length;
  const isChecklistComplete = checklist.length > 0 && remainingChecklist.length === 0;
  const shouldShowChecklistPanel = !hideChecklist && !isChecklistComplete;
  const summary = insights?.summary;
  const followUpQueue = insights?.topInvoices || [];
  const focusItems = insights?.focusItems || [];
  const isExecutiveMode = dashboardMode === 'executive';

  const moneyIn = Number(finance?.moneyIn || 0);
  const moneyOut = Number(finance?.moneyOut || 0);
  const netProfit = Number(finance?.netProfit || 0);

  function renderChangeText(changePct) {
    if (changePct == null) return `New ${finance?.comparisonLabel || 'vs previous period'}`;
    if (changePct === 0) return `Flat ${finance?.comparisonLabel || 'vs previous period'}`;
    return `${changePct > 0 ? '+' : ''}${changePct}% ${finance?.comparisonLabel || 'vs previous period'}`;
  }

  return (
    <div className="page-reveal space-y-6">
      <div className="rounded-[28px] bg-slate-900 px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-300">Operator Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {isExecutiveMode ? 'Executive overview for fast decisions.' : 'Stay ahead of collections and cash flow.'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              {isExecutiveMode
                ? 'High-level KPIs and trend clarity with less noise. Switch back to Operator mode any time for task-by-task execution.'
                : 'Built for daily execution. Prioritize due invoices, monitor profit trends, and move from insight to action in a few clicks.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end sm:items-center">
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/60 p-1">
              <button
                type="button"
                onClick={() => updateDashboardMode('operator')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  !isExecutiveMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Operator Mode
              </button>
              <button
                type="button"
                onClick={() => updateDashboardMode('executive')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isExecutiveMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Executive Mode
              </button>
            </div>
            <Link to="/invoices/new" className="btn-primary border border-primary-500 shadow-lg shadow-primary-900/20">
              <PlusIcon className="w-4 h-4" />
              New Invoice
            </Link>
            <Link to="/expenses" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Log Expense
            </Link>
            <Link to="/clients" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Add Client
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-wide text-slate-400">{isExecutiveMode ? 'Net Profit' : 'Checklist Progress'}</p>
            {isExecutiveMode ? (
              <>
                <p className={`mt-2 text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {fmt(netProfit)}
                </p>
                <p className="mt-1 text-sm text-slate-300">{finance?.comparisonLabel || 'vs previous period'}</p>
              </>
            ) : hideChecklist ? (
              <>
                <p className="mt-2 text-2xl font-bold">Hidden</p>
                <p className="mt-1 text-sm text-slate-300">Checklist is currently hidden for this account.</p>
                <button
                  type="button"
                  onClick={() => setChecklistHidden(false)}
                  className="mt-3 text-xs font-semibold text-white underline underline-offset-4"
                >
                  Show checklist
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold">
                  {isChecklistComplete ? 'Complete' : `${completedChecklist}/${checklist.length || 5}`}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {isChecklistComplete
                    ? 'Core setup is finished. Remaining cards now drive daily operations.'
                    : 'Complete the basics to get cleaner billing and reporting.'}
                </p>
              </>
            )}
          </div>
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-wide text-slate-400">Pending Collections</p>
            <p className="mt-2 text-2xl font-bold">{fmt(summary?.pendingCollections || 0)}</p>
            <p className="mt-1 text-sm text-slate-300">Outstanding balance across open invoices.</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-wide text-slate-400">Revenue Trend</p>
            <p className="mt-2 text-2xl font-bold">
              {summary?.revenueTrend == null ? 'New' : `${summary.revenueTrend > 0 ? '+' : ''}${summary.revenueTrend}%`}
            </p>
            <p className="mt-1 text-sm text-slate-300">Month-over-month paid invoice movement.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InsightCard
          icon={BanknotesIcon}
          label="30-Day Forecast"
          value={fmt(summary?.forecastThirtyDays || 0)}
          detail="Expected collections from invoices due in the next 30 days."
          tone="primary"
        />
        <InsightCard
          icon={ArrowTrendingUpIcon}
          label="Average Payment Time"
          value={summary?.averagePaymentDays != null ? `${summary.averagePaymentDays} days` : 'N/A'}
          detail="Use this to decide how early reminders should start."
          tone="success"
        />
        <InsightCard
          icon={ExclamationTriangleIcon}
          label="At-Risk Invoices"
          value={String(summary?.atRiskCount || 0)}
          detail="High-balance or stale invoices that need follow-up now."
          tone="warning"
        />
      </div>

      {!isExecutiveMode && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Collections Priority Queue</h2>
              <p className="mt-0.5 text-xs text-gray-500">Most urgent invoices to follow up next.</p>
            </div>
            <Link to="/invoices" className="text-sm font-medium text-primary-600 hover:underline">
              Open invoices
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {insightsQuery.isLoading && (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">Loading priority queue...</p>
            )}
            {!insightsQuery.isLoading && followUpQueue.length === 0 && (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No invoices need follow-up right now.</p>
            )}
            {!insightsQuery.isLoading && followUpQueue.map((inv) => (
              <Link
                key={inv.id}
                to={`/invoices/${inv.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{inv.clientName}</p>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {inv.lastReminder
                      ? `Last reminder ${format(new Date(inv.lastReminder.sentAt), 'MMM dd')}`
                      : 'No reminder sent yet'}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${dueTone(inv.daysUntilDue)}`}>
                    {formatDueLabel(inv.daysUntilDue)}
                  </span>
                  <div className="flex items-center gap-1.5 text-right">
                    <BellAlertIcon className="h-4 w-4 text-primary-600" />
                    <p className="text-sm font-semibold text-gray-800">{fmt(inv.balance)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">Focus This Week</h2>
          <p className="mt-1 text-sm text-gray-500">Quick action stack based on account activity.</p>
          <div className="mt-5 space-y-3">
            {insightsQuery.isLoading && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Building your weekly focus list...
              </div>
            )}
            {!insightsQuery.isLoading && focusItems.length === 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                Workspace health is strong. Keep invoices moving and expenses current.
              </div>
            )}
            {!insightsQuery.isLoading && focusItems.map((item) => (
              <Link
                key={item.title}
                to={item.path}
                className={`block rounded-2xl border px-4 py-4 transition hover:shadow-sm ${
                  item.tone === 'danger'
                    ? 'border-red-100 bg-red-50/70'
                    : item.tone === 'warning'
                      ? 'border-amber-100 bg-amber-50/70'
                      : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="card p-6">
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cash Flow Snapshot</h2>
            <p className="mt-1 text-sm text-gray-500">Track money in, money out, and net profit with quick range switching.</p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setFinanceRange('month')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                financeRange === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setFinanceRange('quarter')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                financeRange === 'quarter' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              3 Months
            </button>
            <button
              type="button"
              onClick={() => setFinanceRange('year')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                financeRange === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Money In</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{financeQuery.isLoading ? '--' : fmt(moneyIn)}</p>
            <p className="mt-2 text-sm text-emerald-800">Payments collected in the selected range.</p>
            <p className="mt-3 text-xs font-semibold text-emerald-700">{renderChangeText(finance?.moneyInChangePct)}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Money Out</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{financeQuery.isLoading ? '--' : fmt(moneyOut)}</p>
            <p className="mt-2 text-sm text-red-800">Expenses recorded in the selected range.</p>
            <p className="mt-3 text-xs font-semibold text-red-700">{renderChangeText(finance?.moneyOutChangePct)}</p>
          </div>
          <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Net Profit</p>
            <p className={`mt-3 text-3xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {financeQuery.isLoading ? '--' : fmt(netProfit)}
            </p>
            <p className="mt-2 text-sm text-primary-800">Money in minus money out for the selected range.</p>
            <p className={`mt-3 text-xs font-semibold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {renderChangeText(finance?.netProfitChangePct)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Net Profit Trend</p>
              <p className="mt-1 text-xs text-gray-500">{finance?.trendLabel || 'Trend over the selected period'}</p>
            </div>
            <p className="text-xs font-medium text-gray-500">{finance?.comparisonLabel || 'vs previous period'}</p>
          </div>
          <div className="mt-4 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finance?.trend || []} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value) => [fmt(value), 'Net Profit']} />
                <Area type="monotone" dataKey="netProfit" stroke="#2563eb" strokeWidth={2} fill="url(#profitTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={`grid gap-4 ${isExecutiveMode ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <StatCard
          label="Outstanding"
          value={fmt(stats?.totalOutstanding || 0)}
          sub={`${stats?.outstandingCount || 0} invoice(s)`}
          color="primary"
          icon={DocumentTextIcon}
        />
        <StatCard
          label="Paid This Month"
          value={fmt(stats?.paidThisMonth || 0)}
          color="green"
          icon={BanknotesIcon}
        />
        <StatCard
          label="Overdue"
          value={stats?.overdueCount || 0}
          sub="invoice(s) past due"
          color="red"
          icon={ExclamationCircleIcon}
        />
        <StatCard
          label="Expenses (Month)"
          value={fmt(stats?.expensesThisMonth || 0)}
          sub={`${stats?.clientCount || 0} active clients`}
          color="yellow"
          icon={ReceiptPercentIcon}
        />
      </div>

      <div className={`grid grid-cols-1 gap-6 ${isExecutiveMode ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Revenue vs Expenses (6 months)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenue || []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v, name) => [fmt(v), name === 'revenue' ? 'Revenue' : 'Expenses']} />
              <Legend formatter={(v) => (v === 'revenue' ? 'Revenue' : 'Expenses')} />
              <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#rev)" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#exp)" />
            </AreaChart>
          </ResponsiveContainer>
          {revenueQuery.isLoading && <p className="mt-2 text-xs text-gray-500">Loading trend data...</p>}
        </div>

        {!isExecutiveMode && (
        <div className="card">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Expenses</h2>
            <Link to="/expenses" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activityQuery.isLoading && (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Loading recent expenses...</p>
            )}
            {!activityQuery.isLoading && activity?.recentExpenses?.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-gray-400">No expenses yet.</p>
            )}
            {!activityQuery.isLoading && activity?.recentExpenses?.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="flex items-center gap-3">
                  {exp.category && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: exp.category.color }}
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{exp.vendor}</p>
                    <p className="text-xs text-gray-500">{exp.category?.name || 'Uncategorized'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{fmt(exp.amount)}</p>
                  <p className="text-xs text-gray-400">{format(new Date(exp.date), 'MMM dd')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {!isExecutiveMode && (shouldShowChecklistPanel ? (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Onboarding Checklist</h2>
              <p className="mt-1 text-sm text-gray-500">Complete these setup steps once, then keep operating from the priority queue above.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                {completedChecklist}/{checklist.length || 5} complete
              </span>
              <button
                type="button"
                onClick={() => setChecklistHidden(true)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Hide
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {remainingChecklist.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-4 transition hover:border-primary-200 hover:bg-primary-50/40"
              >
                <div className="mt-0.5 rounded-full bg-slate-100 p-1 text-slate-500">
                  <CheckCircleIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Onboarding Checklist</h2>
              <p className="mt-1 text-sm text-gray-500">Checklist is hidden for this account.</p>
            </div>
            <button
              type="button"
              onClick={() => setChecklistHidden(false)}
              className="btn-secondary w-fit"
            >
              <ClockIcon className="h-4 w-4" />
              Show Checklist
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
