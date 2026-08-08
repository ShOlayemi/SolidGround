import { createClient } from '@supabase/supabase-js'

/** Seeds five deterministic demo personas. Requires SUPABASE_SERVICE_ROLE_KEY and applied migrations. */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

type Persona = { email: string; name: string; score?: number; role?: string }
const personas: Persona[] = [
  { email: 'demo-single@solidground.ai', name: 'Sarah Mitchell', score: 72 },
  { email: 'demo-james@solidground.ai', name: 'James Carter', score: 68 },
  { email: 'demo-emma@solidground.ai', name: 'Emma Carter', score: 81 },
  { email: 'demo-premium@solidground.ai', name: 'Marcus Reed', score: 79 },
  { email: 'demo-admin@solidground.ai', name: 'Alex Morgan', role: 'admin', score: 86 },
]
const categories = ['values', 'communication', 'emotional_intimacy', 'conflict_resolution', 'finances', 'lifestyle', 'family', 'faith', 'career', 'health', 'social_life', 'growth']
const uid = new Map<string, string>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call<T>(label: string, query: PromiseLike<{ data: T; error: any }>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}
async function main() {
  for (const persona of personas) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await db.auth.admin.listUsers({ perPage: 1000 }) as any
    const found = existing.data?.users?.find((u: { email?: string; id: string }) => u.email?.toLowerCase() === persona.email)
    let userId: string
    if (found) {
      userId = found.id
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await db.auth.admin.createUser({ email: persona.email, password: 'Demo123!', email_confirm: true, user_metadata: { full_name: persona.name, display_name: persona.name.split(' ')[0] } }) as any
      if (created.error) throw new Error(`create ${persona.email}: ${created.error.message}`)
      userId = created.data.user!.id
    }
    uid.set(persona.email, userId)
    await call('profile', db.from('profiles').upsert({ id: userId, full_name: persona.name, display_name: persona.name.split(' ')[0], relationship_status: persona.email.includes('single') ? 'single' : 'in_relationship', onboarding_completed: true, role: persona.role ?? 'user' }, { onConflict: 'id' }))
  }
  const sessions = new Map<string, string>()
  for (const persona of personas) {
    if (!persona.score) continue
    const userId = uid.get(persona.email)!
    const existingSession = await call('find assessment session', db.from('assessment_sessions').select('id').eq('user_id', userId).eq('status', 'completed').limit(1).maybeSingle())
    const session = (existingSession ?? await call('assessment session', db.from('assessment_sessions').insert({ user_id: userId, status: 'completed', current_question_index: 88, total_questions_answered: 88, current_dimension: 'growth', started_at: '2026-07-10T10:00:00Z', completed_at: '2026-07-10T11:25:00Z' }).select('id').single()))!
    sessions.set(persona.email, session.id)
    const answers = Array.from({ length: 88 }, (_, i) => ({ session_id: session.id, question_id: `q-${i + 1}`, category: categories[i % categories.length], answer: { value: Math.max(1, Math.min(5, 3 + ((i * 7 + persona.score!) % 3 - 1))), label: 'Demo response' } }))
    await call('assessment answers', db.from('assessment_answers').upsert(answers, { onConflict: 'session_id,question_id' }))
    const values = categories.reduce<Record<string, number>>((all, category, i) => { all[category] = Math.max(48, Math.min(95, persona.score! + ((i * 9) % 19) - 9)); return all }, {})
    if (persona.email.includes('single')) { values.communication = 91; values.finances = 64; values.conflict_resolution = 48 }
    if (persona.email.includes('james')) { values.values = 86; values.finances = 84; values.emotional_intimacy = 49 }
    if (persona.email.includes('emma')) { values.communication = 93; values.lifestyle = 89; values.conflict_resolution = 55 }
    await call('blueprint result', db.from('blueprint_results').upsert({ session_id: session.id, user_id: userId, overall_score: persona.score, overall_confidence: 94, category_results: values, weight_config: { version: 1 } }, { onConflict: 'session_id' }))
    await call('ai insight', db.from('ai_insights').upsert({ user_id: userId, session_id: session.id, blueprint_summary: `${persona.name} has a thoughtful compatibility profile with clear strengths and practical growth opportunities.`, personal_strengths: ['Self-awareness', 'Commitment to growth', 'Values clarity'], growth_opportunities: ['Conflict resolution', 'Emotional expression'], reflection_questions: ['What helps you feel heard during tension?'], communication_recommendations: ['Use a pause-and-return agreement'], relationship_readiness: { score: persona.score! + 6, summary: 'Ready for intentional partnership.' } }, { onConflict: 'session_id' }))
  }

  // Seed the activity feed with representative events for every demo persona.
  const auditRows = personas.flatMap((persona) => {
    const userId = uid.get(persona.email)!
    const sessionId = sessions.get(persona.email)
    return [
      { user_id: userId, action: 'profile.update', resource: 'profile', resource_id: userId, details: { source: 'demo_seed', fields: ['display_name', 'relationship_status'] } },
      ...(sessionId ? [
        { user_id: userId, action: 'assessment.session_create', resource: 'assessment_session', resource_id: sessionId, details: { source: 'demo_seed', status: 'completed' } },
        { user_id: userId, action: 'assessment.answer_save', resource: 'assessment_session', resource_id: sessionId, details: { source: 'demo_seed', questions_answered: 88 } },
        { user_id: userId, action: 'scoring.compute', resource: 'blueprint_result', resource_id: sessionId, details: { source: 'demo_seed', score: persona.score } },
      ] : []),
    ]
  })
  await call('audit logs', db.from('audit_logs').insert(auditRows))

  const jamesId = uid.get('demo-james@solidground.ai')!, emmaId = uid.get('demo-emma@solidground.ai')!
  const jamesSession = sessions.get('demo-james@solidground.ai')!, emmaSession = sessions.get('demo-emma@solidground.ai')!
  const pairing = (await call('pairing', db.from('pairings').upsert({ invite_code: 'DEMO-JAMES-EMMA', inviter_user_id: jamesId, inviter_session_id: jamesSession, invitee_user_id: emmaId, invitee_session_id: emmaSession, status: 'completed', alignment_results: { overall_score: 74 } }, { onConflict: 'invite_code' }).select('id').single()))!
  await call('pairing audit logs', db.from('audit_logs').insert([
    { user_id: jamesId, action: 'pairing.create', resource: 'pairing', resource_id: pairing.id, details: { source: 'demo_seed', invite_code: 'DEMO-JAMES-EMMA' } },
    { user_id: emmaId, action: 'pairing.accept', resource: 'pairing', resource_id: pairing.id, details: { source: 'demo_seed', invite_code: 'DEMO-JAMES-EMMA' } },
  ]))
  const messages = ['I loved seeing our shared values come through.', 'The conflict section gives us a good conversation to have.', 'I agree — let’s try the pause-and-return idea.', 'Our lifestyle alignment feels really encouraging.', 'Want to talk through finances this weekend?', 'Absolutely. I appreciate how practical this report is.', 'Same here. It feels like a starting point, not a verdict.', 'I’m glad we did this together.']
  await call('pairing messages', db.from('pairing_messages').upsert(messages.map((content, i) => ({ pairing_id: pairing.id, sender_user_id: i % 2 ? emmaId : jamesId, content, created_at: new Date(Date.UTC(2026, 6, 11, 12, i * 4)).toISOString() })), { onConflict: 'id' }))
  await call('comparison report', db.from('comparison_reports').upsert({ pairing_id: pairing.id, overall_compatibility: 74, category_comparisons: { values: 84, communication: 76, finances: 78, lifestyle: 81 }, shared_strengths: ['Shared values', 'Practical planning'], potential_conflicts: [{ category: 'conflict_resolution', severity: 'moderate', type: 'style_difference' }], conversation_guides: [{ category: 'conflict_resolution', prompts: ['How can we make repair feel safe?'] }], growth_opportunities: ['Emotional expression', 'Repair rituals'], deal_breaker_intersections: [] }, { onConflict: 'pairing_id' }))
  const marcusId = uid.get('demo-premium@solidground.ai')!
  const subscription = (await call('subscription', db.from('subscriptions').upsert({ user_id: marcusId, stripe_subscription_id: 'demo_sub_premium_annual', stripe_price_id: 'demo_price_annual', plan_tier: 'premium_annual', status: 'active', current_period_start: '2026-01-15T00:00:00Z', current_period_end: '2027-01-15T00:00:00Z' }, { onConflict: 'stripe_subscription_id' }).select('id').single()))!
  await call('stripe customer', db.from('stripe_customers').upsert({ user_id: marcusId, stripe_customer_id: 'demo_cus_marcus' }, { onConflict: 'user_id' }))
  await call('payments', db.from('payments').upsert([{ user_id: marcusId, subscription_id: subscription.id, stripe_payment_intent_id: 'demo_pi_january', stripe_invoice_id: 'demo_inv_january', amount: 9590, status: 'succeeded' }, { user_id: marcusId, subscription_id: subscription.id, stripe_payment_intent_id: 'demo_pi_february', stripe_invoice_id: 'demo_inv_february', amount: 9590, status: 'succeeded' }], { onConflict: 'stripe_payment_intent_id' }))
  await call('invoices', db.from('invoice_history').upsert([{ user_id: marcusId, stripe_invoice_id: 'demo_inv_january', amount_paid: 9590, status: 'paid' }, { user_id: marcusId, stripe_invoice_id: 'demo_inv_february', amount_paid: 9590, status: 'paid' }], { onConflict: 'stripe_invoice_id' }))
  await call('billing event', db.from('billing_events').insert({ user_id: marcusId, event_type: 'subscription.created', event_data: { source: 'demo_seed', plan: 'premium_annual' } }))
  const sarahId = uid.get('demo-single@solidground.ai')!
  const marcusSession = sessions.get('demo-premium@solidground.ai')!
  await call('premium insights', db.from('ai_insights').insert({ user_id: marcusId, session_id: marcusSession, blueprint_summary: 'Marcus shows strong relationship readiness and a grounded approach to partnership.', personal_strengths: ['Reliability', 'Long-term thinking'], growth_opportunities: ['Expressing needs early'], reflection_questions: ['What support helps you stay open?'], communication_recommendations: ['Name appreciation regularly'], relationship_readiness: { score: 88, summary: 'Strong readiness.' } }))
  await call('pending invite', db.from('pairings').upsert({ invite_code: 'DEMO-MARCUS-PENDING', inviter_user_id: marcusId, inviter_session_id: marcusSession, status: 'pending' }, { onConflict: 'invite_code' }))
  await call('accepted invite', db.from('pairings').upsert({ invite_code: 'DEMO-MARCUS-ACCEPTED', inviter_user_id: marcusId, inviter_session_id: marcusSession, invitee_user_id: sarahId, invitee_session_id: sessions.get('demo-single@solidground.ai'), status: 'accepted' }, { onConflict: 'invite_code' }))
  console.log(`Seeded ${personas.length} demo users. Password for all: Demo123!`)
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
