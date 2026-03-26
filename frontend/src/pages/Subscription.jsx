import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowTopRightOnSquareIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { billingService } from '../services/api';
import toast from 'react-hot-toast';

function formatMoney(amount, currency = 'usd') {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency || 'usd').toUpperCase(),
  }).format(amount / 100);
}

export default function Subscription() {
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
  const cards = summaryData?.cards || [];

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
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-gray-500">No active subscription yet.</p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{sub.items?.[0]?.productName || 'Subscription'}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 uppercase tracking-wide">
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
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>

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
            {plans.map((plan) => (
              <div key={plan.key} className="rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-500">{plan.description || 'Subscription plan'}</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatMoney(plan.amount, plan.currency)}
                  {plan.interval ? <span className="text-sm font-normal text-gray-500"> / {plan.interval}</span> : null}
                </p>
                <button
                  type="button"
                  className="btn-primary mt-auto"
                  disabled={checkoutMutation.isPending}
                  onClick={() => checkoutMutation.mutate(plan.key)}
                >
                  {checkoutMutation.isPending ? 'Opening checkout…' : `Subscribe`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
