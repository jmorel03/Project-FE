import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCardIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { billingService } from '../services/api';
import toast from 'react-hot-toast';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function formatMoney(amount, currency = 'usd') {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency || 'usd').toUpperCase(),
  }).format(amount / 100);
}

function AddCardForm({ onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  if (!stripeKey) {
    return (
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-700">Stripe is not configured. Add <code className="font-mono text-xs">VITE_STRIPE_PUBLISHABLE_KEY</code> to your environment variables.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error('Secure card form is still loading. Please wait a second and try again.');
      return;
    }
    setSaving(true);
    try {
      const { clientSecret } = await billingService.createSetupIntent();
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success('Card added successfully');
        onSuccess();
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to add card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="rounded-lg border border-gray-200 p-4 bg-white">
        {!stripe ? (
          <p className="text-sm text-gray-500">Loading secure card form…</p>
        ) : (
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: { fontSize: '14px', color: '#111827', '::placeholder': { color: '#9ca3af' } },
              },
            }}
          />
        )}
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving || !stripe} className="btn-primary">
          {saving ? 'Saving…' : 'Save card'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function Subscription() {
  const queryClient = useQueryClient();
  const [showAddCard, setShowAddCard] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

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
    onSuccess: (data) => { if (data?.url) window.location.href = data.url; },
    onError: (err) => toast.error(err?.response?.data?.error || 'Unable to start checkout'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: billingService.setDefaultPaymentMethod,
    onSuccess: () => { toast.success('Default card updated'); refetch(); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update'),
  });

  const deleteCardMutation = useMutation({
    mutationFn: billingService.deletePaymentMethod,
    onSuccess: () => { toast.success('Card removed'); refetch(); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to remove'),
  });

  const cancelMutation = useMutation({
    mutationFn: billingService.cancelSubscription,
    onSuccess: () => {
      toast.success('Subscription will cancel at end of billing period');
      setCancelConfirm(false);
      refetch();
      queryClient.invalidateQueries(['billing-summary']);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to cancel'),
  });

  const plans = plansData?.plans || [];
  const subscriptions = summaryData?.subscriptions || [];
  const persistedSubscriptions = summaryData?.persistedSubscriptions || [];
  const cards = summaryData?.cards || [];
  const billingConfigured = summaryData?.billingConfigured !== false;

  const activeSub = subscriptions.find((s) => s.status === 'active' || s.status === 'trialing');
  const persistedActive = persistedSubscriptions.find((p) => String(p.status).toLowerCase() === 'active');
  const activePlanKeyFromStripe = activeSub?.items?.[0]?.priceId
    ? plans.find((p) => p.priceId === activeSub.items[0].priceId)?.key
    : null;
  const activePlanKey = activePlanKeyFromStripe || persistedActive?.planKey || null;

  const hasPaidSub = activeSub && !activeSub.cancelAtPeriodEnd;

  return (
    <Elements stripe={stripePromise}>
      <div className="space-y-8 max-w-5xl">
        <div>
          <h1 className="page-title">Subscription</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your plan and payment methods.</p>
        </div>

        {/* Current Subscription */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700" onClick={() => refetch()}>
              Refresh
            </button>
          </div>

          {summaryLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : activeSub ? (
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{activeSub.items?.[0]?.productName || 'Subscription'}</p>
                <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wide ${activeSub.cancelAtPeriodEnd ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {activeSub.cancelAtPeriodEnd ? 'Cancels at period end' : activeSub.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {formatMoney(activeSub.items?.[0]?.amount, activeSub.items?.[0]?.currency)}
                {activeSub.items?.[0]?.interval ? ` / ${activeSub.items[0].interval}` : ''}
              </p>
              {activeSub.currentPeriodEnd && (
                <p className="text-xs text-gray-500 mt-2">
                  {activeSub.cancelAtPeriodEnd ? 'Access until' : 'Renews'}: {new Date(activeSub.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {hasPaidSub && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {cancelConfirm ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-gray-700">Cancel at end of billing period?</p>
                      <button
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? 'Canceling…' : 'Yes, cancel'}
                      </button>
                      <button className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setCancelConfirm(false)}>
                        Keep plan
                      </button>
                    </div>
                  ) : (
                    <button className="text-sm text-red-600 hover:text-red-700" onClick={() => setCancelConfirm(true)}>
                      Cancel subscription
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : activePlanKey ? (
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 capitalize">{activePlanKey} Plan</p>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">Active</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Free — upgrade anytime below.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active subscription.</p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
            {!showAddCard && (
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400" onClick={() => setShowAddCard(true)} disabled={!billingConfigured}>
                + Add card
              </button>
            )}
          </div>

          {summaryLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <>
              {!billingConfigured && (
                <p className="text-sm text-amber-700 mb-3">Billing is not configured on the server yet. Card management is temporarily unavailable.</p>
              )}
              {cards.length === 0 && !showAddCard && (
                <p className="text-sm text-gray-500">No cards on file.</p>
              )}
              {cards.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
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
                      <div className="flex items-center gap-2">
                        {card.isDefault ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-700">Default</span>
                        ) : (
                          <button
                            className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1"
                            onClick={() => setDefaultMutation.mutate(card.id)}
                            disabled={setDefaultMutation.isPending}
                            title="Set as default"
                          >
                            <CheckIcon className="w-3.5 h-3.5" /> Default
                          </button>
                        )}
                        <button
                          className="p-1 text-gray-400 hover:text-red-500"
                          onClick={() => deleteCardMutation.mutate(card.id)}
                          disabled={deleteCardMutation.isPending}
                          title="Remove card"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showAddCard && (
                <AddCardForm
                  onSuccess={() => { setShowAddCard(false); refetch(); }}
                  onCancel={() => setShowAddCard(false)}
                />
              )}
            </>
          )}
        </div>

        {/* Choose a Plan */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Plan</h2>

          {plansLoading ? (
            <p className="text-sm text-gray-500">Loading plans…</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrent = activePlanKey === plan.key;
                return (
                  <div
                    key={plan.key}
                    className={`rounded-lg border p-4 flex flex-col gap-3 ${isCurrent ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
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
      </div>
    </Elements>
  );
}
