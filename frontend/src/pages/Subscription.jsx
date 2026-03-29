import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowTopRightOnSquareIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { billingService } from '../services/api';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

function formatMoney(amount, currency = 'usd') {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency || 'usd').toUpperCase(),
  }).format(amount / 100);
}

const comparisonRows = [
  { label: 'Invoices', key: 'invoices' },
  { label: 'Team Members', key: 'teamMembers' },
  { label: 'Automation', key: 'automation' },
  { label: 'Reporting', key: 'reporting' },
];

export default function Subscription() {
  useDocumentTitle('Xpensist | Subscription');

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: billingService.getPlans,
  });

  const { data: summaryData, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ['billing-summary'],
    queryFn: billingService.getSummary,
  });

  const checkoutMutation = useMutation({
    mutationFn: billingService.createCheckoutSession,
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Unable to start checkout'),
  });

  const portalMutation = useMutation({
    mutationFn: billingService.createPortalSession,
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Unable to open billing portal'),
  });

  const plans = plansData?.plans || [];
  const subscriptions = summaryData?.subscriptions || [];
  const persistedSubscriptions = summaryData?.persistedSubscriptions || [];
  const cards = summaryData?.cards || [];

  // Determine current plan key — prefer live Stripe subscription, fallback to DB record.
  const activeSub = subscriptions.find((s) => s.status === 'active' || s.status === 'trialing');
  const activePlanKey =
    activeSub?.items?.[0]?.priceId
      ? plans.find((p) => p.priceId === activeSub.items[0].priceId)?.key
      : persistedSubscriptions.find((p) => p.status === 'active')?.planKey || null;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Subscription</h1>
          <p className="text-sm text-gray-500 mt-1">Manage plans, payment methods, and billing details.</p>
        </div>
        <button
          type="button"
          onClick={() => portalMutation.mutate()}
          disabled={portalMutation.isPending}
          className="btn-secondary"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          {portalMutation.isPending ? 'Opening…' : 'Manage Billing'}
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Current Subscription</h2>
          <button className="text-sm text-primary-600 hover:text-primary-700" onClick={() => refetch()}>
            Refresh
          </button>
        </div>

        {summaryLoading ? (
          <p className="text-sm text-gray-500">Loading subscription details…</p>
        ) : activeSub ? (
          <div className="space-y-3">
            {subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing').map((sub) => (
              <div key={sub.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{sub.items?.[0]?.productName || 'Subscription'}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">
                    {sub.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {formatMoney(sub.items?.[0]?.amount, sub.items?.[0]?.currency)}
                  {sub.items?.[0]?.interval ? ` / ${sub.items[0].interval}` : ''}
                </p>
                {sub.currentPeriodEnd && (
                  <p className="text-xs text-gray-500 mt-2">
                    Current period ends: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : activePlanKey ? (
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 capitalize">{activePlanKey} Plan</p>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">Active</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Free — upgrade anytime to unlock more features.</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No active subscription yet.</p>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
          <button
            type="button"
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {portalMutation.isPending ? 'Opening…' : 'Add Payment Method'}
          </button>
        </div>
        {summaryLoading ? (
          <p className="text-sm text-gray-500">Loading cards…</p>
        ) : cards.length === 0 ? (
          <p className="text-sm text-gray-500">No cards on file yet. Use Manage Billing to add one.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {cards.map((card) => (
              <div key={card.id} className="rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-gray-100">
                    <CreditCardIcon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 uppercase">{card.brand} •••• {card.last4}</p>
                    <p className="text-xs text-gray-500">Expires {card.expMonth}/{card.expYear}</p>
                  </div>
                </div>
                {card.isDefault && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-700">Default</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a Plan</h2>

        {plansLoading ? (
          <p className="text-sm text-gray-500">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-gray-500">No Stripe plans configured yet. Add Stripe price IDs in backend environment variables.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = activePlanKey === plan.key;
              return (
                <div
                  key={plan.key}
                  className={`rounded-lg border p-4 flex flex-col gap-3 ${
                    isCurrent ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500">{plan.description || 'Subscription plan'}</p>
                    </div>
                    {isCurrent && (
                      <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 font-medium">Current</span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {plan.isFree ? 'Free' : formatMoney(plan.amount, plan.currency)}
                    {plan.interval ? <span className="text-sm font-normal text-gray-500"> / {plan.interval}</span> : null}
                  </p>
                  {plan.tagline && <p className="text-sm text-gray-500">{plan.tagline}</p>}
                  {plan.perks?.length > 0 && (
                    <div className="space-y-2 text-sm text-gray-600">
                      {plan.perks.slice(0, 4).map((perk) => (
                        <div key={perk} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-500" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isCurrent ? (
                    <div className="mt-auto text-sm text-center text-primary-700 font-medium py-2">Your current plan</div>
                  ) : plan.isFree ? (
                    <div className="mt-auto text-sm text-center text-gray-400 py-2">Included with every account</div>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary mt-auto"
                      disabled={checkoutMutation.isPending}
                      onClick={() => checkoutMutation.mutate(plan.key)}
                    >
                      {checkoutMutation.isPending ? 'Opening checkout…' : 'Upgrade'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {plans.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Comparison</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-500">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.key} className="px-4 py-3 font-semibold text-gray-900">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {comparisonRows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-4 py-3 font-medium text-gray-600">{row.label}</td>
                    {plans.map((plan) => (
                      <td key={`${plan.key}-${row.key}`} className="px-4 py-3 text-gray-800">{plan.limits?.[row.key] || 'Included'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
