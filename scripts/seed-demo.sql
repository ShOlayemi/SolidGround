-- SolidGround AI demo data seed. Apply migrations 001-021 first, then run scripts/seed-demo.ts
-- Auth users (and Demo123! passwords) are intentionally created by the TypeScript Admin API.
-- This SQL is safe to re-run after those users exist.
DO $$
DECLARE
  sarah uuid := (SELECT id FROM auth.users WHERE email = 'demo-single@solidground.ai');
  james uuid := (SELECT id FROM auth.users WHERE email = 'demo-james@solidground.ai');
  emma uuid := (SELECT id FROM auth.users WHERE email = 'demo-emma@solidground.ai');
  marcus uuid := (SELECT id FROM auth.users WHERE email = 'demo-premium@solidground.ai');
  admin_id uuid := (SELECT id FROM auth.users WHERE email = 'demo-admin@solidground.ai');
  s_sarah uuid; s_james uuid; s_emma uuid; s_marcus uuid; p_id uuid;
  cats text[] := ARRAY['values','communication','emotional_intimacy','conflict_resolution','finances','lifestyle','family','faith','career','health','social_life','growth'];
  answers jsonb := '{}'::jsonb; category_data jsonb := '{}'::jsonb;
  i integer; c text;
BEGIN
  IF sarah IS NULL OR james IS NULL OR emma IS NULL OR marcus IS NULL OR admin_id IS NULL THEN
    RAISE EXCEPTION 'Run seed-demo.ts first: all five demo auth users are required';
  END IF;
  INSERT INTO profiles (id, full_name, display_name, relationship_status, onboarding_completed, role)
  VALUES (sarah,'Sarah Mitchell','Sarah','single',true,'user'), (james,'James Carter','James','in_relationship',true,'user'),
         (emma,'Emma Carter','Emma','in_relationship',true,'user'), (marcus,'Marcus Reed','Marcus','in_relationship',true,'user'),
         (admin_id,'Alex Morgan','Alex','in_relationship',true,'admin')
  ON CONFLICT (id) DO UPDATE SET full_name = excluded.full_name, display_name = excluded.display_name,
    onboarding_completed = true, role = excluded.role;
  FOR i IN 1..88 LOOP answers := answers || jsonb_build_object('q-' || i, jsonb_build_object('value', 3 + (i % 3), 'label','Demo response')); END LOOP;
  FOREACH c IN ARRAY cats LOOP category_data := category_data || jsonb_build_object(c, 72); END LOOP;
  INSERT INTO assessment_sessions (user_id,status,current_question_index,total_questions_answered,current_dimension,started_at,completed_at,responses)
  SELECT x.user_id,'completed',88,88,'growth','2026-07-10T10:00:00Z','2026-07-10T11:25:00Z',answers
  FROM (VALUES (sarah),(james),(emma),(marcus),(admin_id)) x(user_id)
  WHERE NOT EXISTS (SELECT 1 FROM assessment_sessions a WHERE a.user_id=x.user_id AND a.status='completed');
  SELECT id INTO s_sarah FROM assessment_sessions WHERE user_id=sarah AND status='completed' ORDER BY created_at LIMIT 1;
  SELECT id INTO s_james FROM assessment_sessions WHERE user_id=james AND status='completed' ORDER BY created_at LIMIT 1;
  SELECT id INTO s_emma FROM assessment_sessions WHERE user_id=emma AND status='completed' ORDER BY created_at LIMIT 1;
  SELECT id INTO s_marcus FROM assessment_sessions WHERE user_id=marcus AND status='completed' ORDER BY created_at LIMIT 1;
  INSERT INTO assessment_answers (session_id,question_id,category,answer)
  SELECT s.id, 'q-'||g, cats[((g-1)%12)+1], jsonb_build_object('value',3+(g%3),'label','Demo response')
  FROM unnest(ARRAY[s_sarah,s_james,s_emma,s_marcus]) s(id), generate_series(1,88) g
  ON CONFLICT (session_id,question_id) DO NOTHING;
  INSERT INTO blueprint_results (session_id,user_id,category_results,overall_score,overall_confidence,weight_config)
  VALUES (s_sarah,sarah,category_data,72,94,'{"version":1}'),(s_james,james,category_data,68,94,'{"version":1}'),
         (s_emma,emma,category_data,81,94,'{"version":1}'),(s_marcus,marcus,category_data,79,94,'{"version":1}')
  ON CONFLICT (session_id) DO UPDATE SET overall_score=excluded.overall_score, category_results=excluded.category_results;
  INSERT INTO ai_insights (user_id,session_id,blueprint_summary,personal_strengths,growth_opportunities,reflection_questions,communication_recommendations,relationship_readiness)
  SELECT u.id,s.id,'A thoughtful compatibility profile with clear strengths and practical growth opportunities.','["Self-awareness","Commitment to growth"]','["Conflict resolution","Emotional expression"]','["What helps you feel heard during tension?"]','["Use a pause-and-return agreement"]','{"score":82,"summary":"Ready for intentional partnership."}'::jsonb
  FROM (VALUES (sarah,s_sarah),(james,s_james),(emma,s_emma),(marcus,s_marcus)) u(id,sid) JOIN profiles p ON p.id=u.id JOIN assessment_sessions s ON s.id=u.sid
  ON CONFLICT (session_id) DO NOTHING;
END $$;
