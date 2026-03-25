import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpIcon, ArrowDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { dashboardService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';

function StatCard({ label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'text-primary-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
  };
  return (
    <div className="stat-card">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

export default function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardService.stats });
  const { data: revenue } = useQuery({ queryKey: ['dashboard-revenue'], queryFn: dashboardService.revenue });
  const { data: activity } = useQuery({ queryKey: ['dashboard-activity'], queryFn: dashboardService.activity });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">Dashboard</h1>
        <Link to="/invoices/new" className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Outstanding"
          value={fmt(stats?.totalOutstanding || 0)}
          sub={`${stats?.outstandingCount || 0} invoice(s)`}
          color="primary"
        />
        <StatCard
          label="Paid This Month"
          value={fmt(stats?.paidThisMonth || 0)}
          color="green"
        />
        <StatCard
          label="Overdue"
          value={stats?.overdueCount || 0}
          sub="invoice(s) past due"
          color="red"
        />
        <StatCard
          label="Expenses (Month)"
          value={fmt(stats?.expensesThisMonth || 0)}
          sub={`${stats?.clientCount || 0} active clients`}
          color="yellow"
        />
      </div>

      {/* Revenue chart */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue vs Expenses (6 months)</h2>
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
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent invoices */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-base font-semibold text-gray-900">Recent Invoices</h2>
            <Link to="/invoices" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activity?.recentInvoices?.length === 0 && (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No invoices yet</p>
            )}
            {activity?.recentInvoices?.map((inv) => (
              <Link
                key={inv.id}
                to={`/invoices/${inv.id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{inv.client?.name}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <Badge status={inv.status} />
                  <p className="text-sm font-semibold text-gray-800">{fmt(inv.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent expenses */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-base font-semibold text-gray-900">Recent Expenses</h2>
            <Link to="/expenses" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activity?.recentExpenses?.length === 0 && (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No expenses yet</p>
            )}
            {activity?.recentExpenses?.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="flex items-center gap-3">
                  {exp.category && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
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
      </div>
    </div>
  );
}
