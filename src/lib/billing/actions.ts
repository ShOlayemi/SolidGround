"use server";

import { createClient } from "@/lib/supabase/server";
import { getDefaultPlan, getPlan } from "@/lib/billing/plans";
import type { BillingOverview, BillingEvent, Invoice, Payment, StripeCustomer, Subscription } from "@/types";

type Row = Record<string, unknown>;
const customerFromRow = (r: Row): StripeCustomer => ({ id: r.id as string, userId: r.user_id as string, stripeCustomerId: r.stripe_customer_id as string | null, createdAt: r.created_at as string, updatedAt: r.updated_at as string });
const subscriptionFromRow = (r: Row): Subscription => ({ id: r.id as string, userId: r.user_id as string, stripeSubscriptionId: r.stripe_subscription_id as string | null, stripePriceId: r.stripe_price_id as string | null, planTier: r.plan_tier as Subscription["planTier"], status: r.status as Subscription["status"], currentPeriodStart: r.current_period_start as string | null, currentPeriodEnd: r.current_period_end as string | null, canceledAt: r.canceled_at as string | null, createdAt: r.created_at as string, updatedAt: r.updated_at as string });
const paymentFromRow = (r: Row): Payment => ({ id: r.id as string, userId: r.user_id as string, subscriptionId: r.subscription_id as string | null, stripePaymentIntentId: r.stripe_payment_intent_id as string | null, stripeInvoiceId: r.stripe_invoice_id as string | null, amount: r.amount as number, currency: r.currency as string, status: r.status as Payment["status"], createdAt: r.created_at as string });
const invoiceFromRow = (r: Row): Invoice => ({ id: r.id as string, userId: r.user_id as string, stripeInvoiceId: r.stripe_invoice_id as string | null, stripeInvoiceUrl: r.stripe_invoice_url as string | null, amountPaid: r.amount_paid as number, currency: r.currency as string, status: r.status as Invoice["status"], invoicePdfUrl: r.invoice_pdf_url as string | null, periodStart: r.period_start as string | null, periodEnd: r.period_end as string | null, createdAt: r.created_at as string });

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getOrCreateStripeCustomer(): Promise<StripeCustomer | null> {
  const { supabase, user } = await currentUser();
  if (!user) return null;
  const existing = await supabase.from("stripe_customers").select("id, user_id, stripe_customer_id, created_at, updated_at").eq("user_id", user.id).maybeSingle();
  if (existing.data) return customerFromRow(existing.data as Row);
  if (existing.error) { console.error("Error fetching Stripe customer:", existing.error); return null; }
  const created = await supabase.from("stripe_customers").insert({ user_id: user.id, stripe_customer_id: null }).select("id, user_id, stripe_customer_id, created_at, updated_at").single();
  if (created.error || !created.data) { console.error("Error creating Stripe customer:", created.error); return null; }
  return customerFromRow(created.data as Row);
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { supabase, user } = await currentUser();
  if (!user || user.id !== userId) return null;
  const { data, error } = await supabase.from("subscriptions").select("id, user_id, stripe_subscription_id, stripe_price_id, plan_tier, status, current_period_start, current_period_end, canceled_at, created_at, updated_at").eq("user_id", userId).in("status", ["active", "trialing", "past_due", "incomplete"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) { console.error("Error fetching subscription:", error); return null; }
  return data ? subscriptionFromRow(data as Row) : null;
}

export async function getUsageStats(): Promise<BillingOverview["usageStats"]> {
  const { supabase, user } = await currentUser();
  if (!user) return { blueprintsCompleted: 0, blueprintLimit: getDefaultPlan().limits.blueprintCount, aiInsightsUsed: 0, aiInsightLimit: getDefaultPlan().limits.aiInsightCount };
  const subscription = await getSubscription(user.id);
  const plan = subscription ? getPlan(subscription.planTier) : getDefaultPlan();
  const [blueprints, insights] = await Promise.all([
    supabase.from("assessment_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
    supabase.from("ai_insights").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  return { blueprintsCompleted: blueprints.count ?? 0, blueprintLimit: plan.limits.blueprintCount, aiInsightsUsed: insights.count ?? 0, aiInsightLimit: plan.limits.aiInsightCount };
}

export async function getPaymentHistory(): Promise<Payment[]> {
  const { supabase, user } = await currentUser();
  if (!user) return [];
  const { data, error } = await supabase.from("payments").select("id, user_id, subscription_id, stripe_payment_intent_id, stripe_invoice_id, amount, currency, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) { console.error("Error fetching payment history:", error); return []; }
  return (data ?? []).map((r) => paymentFromRow(r as Row));
}

export async function getInvoiceHistory(): Promise<Invoice[]> {
  const { supabase, user } = await currentUser();
  if (!user) return [];
  const { data, error } = await supabase.from("invoice_history").select("id, user_id, stripe_invoice_id, stripe_invoice_url, amount_paid, currency, status, invoice_pdf_url, period_start, period_end, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) { console.error("Error fetching invoice history:", error); return []; }
  return (data ?? []).map((r) => invoiceFromRow(r as Row));
}

export async function getBillingOverview(): Promise<BillingOverview> {
  const { user } = await currentUser();
  const subscription = user ? await getSubscription(user.id) : null;
  const [recentPayments, recentInvoices, usageStats] = await Promise.all([getPaymentHistory(), getInvoiceHistory(), getUsageStats()]);
  return { currentPlan: subscription ? getPlan(subscription.planTier) : getDefaultPlan(), subscription, recentPayments: recentPayments.slice(0, 5), recentInvoices: recentInvoices.slice(0, 5), usageStats };
}

export async function logBillingEvent(userId: string, eventType: string, eventData: Record<string, unknown> | null = null): Promise<BillingEvent | null> {
  const { supabase, user } = await currentUser();
  if (!user || user.id !== userId || !eventType.trim()) return null;
  const { data, error } = await supabase.from("billing_events").insert({ user_id: userId, event_type: eventType.trim(), event_data: eventData }).select("id, user_id, event_type, event_data, created_at").single();
  if (error || !data) { console.error("Error logging billing event:", error); return null; }
  const r = data as Row;
  return { id: r.id as string, userId: r.user_id as string, eventType: r.event_type as string, eventData: r.event_data as Record<string, unknown> | null, createdAt: r.created_at as string };
}
