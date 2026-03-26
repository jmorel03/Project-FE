const Stripe = require('stripe');
const prisma = require('../lib/prisma');

const PLAN_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  business: process.env.STRIPE_PRICE_BUSINESS || '',
};

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
};

const getClientBaseUrl = () => process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';

const guessPlanKeyFromPrice = (priceId) =>
  Object.entries(PLAN_PRICE_IDS).find(([, configuredPriceId]) => configuredPriceId === priceId)?.[0] || null;

async function getCurrentUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, companyName: true },
  });
}

async function getOrCreateCustomer(stripe, user) {
  const existingByMeta = await stripe.customers.search({
    query: `metadata['userId']:'${user.id}'`,
    limit: 1,
  });

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

exports.getPlans = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Billing is not configured yet' });
    }

    const plans = await Promise.all(
      Object.entries(PLAN_PRICE_IDS)
        .filter(([, priceId]) => Boolean(priceId))
        .map(async ([key, priceId]) => {
          const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
          return {
            key,
            priceId,
            name: price.product?.name || key,
            description: price.product?.description || '',
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval || null,
          };
        }),
    );

    res.json({ plans });
  } catch (err) {
    next(err);
  }
};

exports.getBillingSummary = async (req, res, next) => {
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

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
      expand: ['data.items.data.price.product'],
    });

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
      limit: 10,
    });

    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
    const persisted = await prisma.billingSubscription.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
      },
      subscriptions: subscriptions.data.map((sub) => ({
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
    const baseUrl = getClientBaseUrl();

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
    const baseUrl = getClientBaseUrl();

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
