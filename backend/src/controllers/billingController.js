const Stripe = require('stripe');
const prisma = require('../lib/prisma');

const PLAN_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  business: process.env.STRIPE_PRICE_BUSINESS || '',
};

const PLAN_DETAILS = {
  starter: {
    tagline: 'For solo operators getting their system in place.',
    cta: 'Start Free',
    perks: [
      'Up to 5 invoices per month',
      'Basic client and expense tracking',
      'PDF invoice export',
      'Email support',
    ],
    limits: {
      invoices: '5 / month',
      teamMembers: '1 seat',
      automation: 'Manual only',
      reporting: 'Basic',
    },
  },
  professional: {
    tagline: 'For growing freelancers and service businesses.',
    cta: 'Upgrade to Professional',
    perks: [
      'Unlimited invoices and clients',
      'Automatic invoice reminder workflows',
      'Advanced dashboard insights',
      'Priority support',
      'Receipt uploads and organization',
    ],
    limits: {
      invoices: 'Unlimited',
      teamMembers: '1 seat',
      automation: 'Reminders and workflows',
      reporting: 'Advanced',
    },
  },
  business: {
    tagline: 'For operators who need admin control and premium support.',
    cta: 'Upgrade to Business',
    perks: [
      'Everything in Professional',
      'Priority onboarding support',
      'Higher-touch billing operations',
      'Shared finance workflows',
      'Future-ready for team expansion',
    ],
    limits: {
      invoices: 'Unlimited',
      teamMembers: 'Up to 5 seats',
      automation: 'Advanced',
      reporting: 'Executive',
    },
  },
};

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
};

function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getClientBaseUrl(req) {
  // Prefer explicit frontend URL first, then app URL, then request origin as fallback.
  return sanitizeBaseUrl(process.env.CLIENT_URL)
    || sanitizeBaseUrl(process.env.APP_URL)
    || sanitizeBaseUrl(req.get('origin'))
    || 'http://localhost:5173';
}

const guessPlanKeyFromPrice = (priceId) =>
  Object.entries(PLAN_PRICE_IDS).find(([, configuredPriceId]) => configuredPriceId === priceId)?.[0] || null;

async function getCurrentUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, companyName: true },
  });
}

async function getOrCreateCustomer(stripe, user) {
  let existingByMeta = { data: [] };
  try {
    existingByMeta = await stripe.customers.search({
      query: `metadata['userId']:'${user.id}'`,
      limit: 1,
    });
  } catch (error) {
    // Some accounts/regions may not have search enabled; fallback to email lookup.
    existingByMeta = { data: [] };
  }

  if (existingByMeta.data.length > 0) {
    return existingByMeta.data[0];
  }

  const existingByEmail = user.email
    ? await stripe.customers.list({ email: user.email, limit: 1 })
    : { data: [] };

  if (existingByEmail.data.length > 0) {
    const customer = existingByEmail.data[0];
    if (!customer.metadata?.userId) {
      await stripe.customers.update(customer.id, {
        metadata: { ...(customer.metadata || {}), userId: user.id },
      });
    }
    return customer;
  }

  return stripe.customers.create({
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
    metadata: {
      userId: user.id,
      companyName: user.companyName || '',
    },
  });
}

async function upsertSubscriptionRecord({ stripeCustomerId, stripeSubscription }) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  const userId = customer?.metadata?.userId;

  if (!userId) {
    return;
  }

  const firstItem = stripeSubscription.items?.data?.[0];
  const priceId = firstItem?.price?.id || null;

  await prisma.billingSubscription.upsert({
    where: { stripeSubscriptionId: stripeSubscription.id },
    create: {
      userId,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      planKey: guessPlanKeyFromPrice(priceId),
      stripePriceId: priceId,
      currentPeriodEnd: stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
    },
    update: {
      status: stripeSubscription.status,
      planKey: guessPlanKeyFromPrice(priceId),
      stripePriceId: priceId,
      currentPeriodEnd: stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
    },
  });
}

const STATIC_FREE_PLAN = {
  key: 'starter',
  priceId: null,
  name: 'Starter',
  description: 'Core expense and invoice tracking — free forever.',
  amount: 0,
  currency: 'usd',
  interval: null,
  isFree: true,
};

const PLAN_ORDER = ['starter', 'professional', 'business'];

exports.getPlans = async (req, res, next) => {
  try {
    const stripe = getStripe();

    // Always include starter as a static free plan.
    const stripeEntries = Object.entries(PLAN_PRICE_IDS).filter(
      ([key, priceId]) => key !== 'starter' && Boolean(priceId),
    );

    const stripePlans = stripe
      ? await Promise.all(
          stripeEntries.map(async ([key, priceId]) => {
            const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
            return {
              key,
              priceId,
              name: price.product?.name || key,
              description: price.product?.description || '',
              amount: price.unit_amount,
              currency: price.currency,
              interval: price.recurring?.interval || null,
              isFree: false,
              ...PLAN_DETAILS[key],
            };
          }),
        )
      : [];

    const allPlans = [{ ...STATIC_FREE_PLAN, ...PLAN_DETAILS.starter }, ...stripePlans].sort(
      (a, b) => PLAN_ORDER.indexOf(a.key) - PLAN_ORDER.indexOf(b.key),
    );

    res.json({ plans: allPlans });
  } catch (err) {
    next(err);
  }
};

exports.getBillingSummary = async (req, res, next) => {
  try {
    const stripe = getStripe();

    const persisted = await prisma.billingSubscription.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!stripe) {
      return res.json({
        customer: null,
        subscriptions: [],
        cards: [],
        persistedSubscriptions: persisted,
        billingConfigured: false,
      });
    }

    const user = await getCurrentUser(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentCustomer = await getOrCreateCustomer(stripe, user);

    // Collect every Stripe customer ID we know about for this user:
    // DB records may reference a different customer than the one returned by getOrCreateCustomer
    // (e.g. if metadata search failed and a new customer was created mid-session).
    const knownCustomerIds = [
      ...new Set([
        currentCustomer.id,
        ...persisted.map((s) => s.stripeCustomerId).filter(Boolean),
      ]),
    ];

    // Fetch subscriptions from ALL known customers and merge them.
    const subArrays = await Promise.all(
      knownCustomerIds.map((cid) =>
        stripe.subscriptions
          .list({ customer: cid, status: 'all', limit: 10, expand: ['data.items.data.price.product'] })
          .then((r) => r.data)
          .catch(() => []),
      ),
    );
    const seenSubIds = new Set();
    const allStripeSubs = subArrays.flat().filter((sub) => {
      if (seenSubIds.has(sub.id)) return false;
      seenSubIds.add(sub.id);
      return true;
    });

    // Sync any newly-found active subscriptions into the DB so future calls are faster.
    for (const sub of allStripeSubs) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        if (customerId) {
          await upsertSubscriptionRecord({ stripeCustomerId: customerId, stripeSubscription: sub }).catch(() => null);
        }
      }
    }

    // Payment methods come from the primary (current) customer.
    const paymentMethods = await stripe.paymentMethods.list({
      customer: currentCustomer.id,
      type: 'card',
      limit: 10,
    });

    const defaultPaymentMethodId = currentCustomer.invoice_settings?.default_payment_method;

    res.json({
      customer: {
        id: currentCustomer.id,
        email: currentCustomer.email,
      },
      subscriptions: allStripeSubs.map((sub) => ({
        id: sub.id,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        items: sub.items.data.map((item) => ({
          priceId: item.price.id,
          productName: item.price.product?.name || 'Plan',
          amount: item.price.unit_amount,
          currency: item.price.currency,
          interval: item.price.recurring?.interval || null,
        })),
      })),
      cards: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: defaultPaymentMethodId === pm.id,
      })),
      persistedSubscriptions: persisted,
      billingConfigured: true,
    });
  } catch (err) {
    next(err);
  }
};

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Billing is not configured yet' });
    }

    const { planKey } = req.body;
    const normalizedPlan = String(planKey || '').toLowerCase();
    const priceId = PLAN_PRICE_IDS[normalizedPlan];

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const user = await getCurrentUser(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const customer = await getOrCreateCustomer(stripe, user);
    const baseUrl = getClientBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings/subscription?checkout=success`,
      cancel_url: `${baseUrl}/settings/subscription?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        planKey: normalizedPlan,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

exports.createSetupIntent = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Billing is not configured yet' });

    const user = await getCurrentUser(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customer = await getOrCreateCustomer(stripe, user);

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    next(err);
  }
};

exports.setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Billing is not configured yet' });

    const { paymentMethodId } = req.body;
    if (!paymentMethodId) return res.status(400).json({ error: 'paymentMethodId required' });

    const user = await getCurrentUser(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customer = await getOrCreateCustomer(stripe, user);

    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.deletePaymentMethod = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Billing is not configured yet' });

    const { paymentMethodId } = req.body;
    if (!paymentMethodId) return res.status(400).json({ error: 'paymentMethodId required' });

    await stripe.paymentMethods.detach(paymentMethodId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Billing is not configured yet' });

    const user = await getCurrentUser(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const activeSub = await prisma.billingSubscription.findFirst({
      where: { userId: user.id, status: { in: ['active', 'trialing'] }, stripeSubscriptionId: { not: { startsWith: 'free_' } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSub) return res.status(404).json({ error: 'No active paid subscription found' });

    await stripe.subscriptions.update(activeSub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.billingSubscription.update({
      where: { id: activeSub.id },
      data: { cancelAtPeriodEnd: true },
    });

    res.json({ ok: true, message: 'Subscription will cancel at end of billing period' });
  } catch (err) {
    next(err);
  }
};

exports.createPortalSession = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Billing is not configured yet' });
    }

    const user = await getCurrentUser(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const customer = await getOrCreateCustomer(stripe, user);
    const baseUrl = getClientBaseUrl(req);

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${baseUrl}/settings/subscription`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

exports.handleStripeWebhook = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).send('Billing not configured');
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).send('Missing webhook signature or secret');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['items.data.price'],
          });
          await upsertSubscriptionRecord({
            stripeCustomerId: session.customer,
            stripeSubscription: subscription,
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await upsertSubscriptionRecord({
          stripeCustomerId: subscription.customer,
          stripeSubscription: subscription,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await prisma.billingSubscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status || 'canceled',
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
          },
        });
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).send(`Webhook processing failed: ${err.message}`);
  }
};
