-- Run this script once against the equipro database.
-- It creates persistent profile/search/wishlist structures used by the app.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  display_name TEXT,
  ort TEXT,
  plz TEXT,
  kategorien TEXT[] DEFAULT ARRAY[]::TEXT[],
  zertifikate TEXT[] DEFAULT ARRAY[]::TEXT[],
  angebot_text TEXT,
  suche_text TEXT,
  gesuche JSONB,
  profil_data JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  profile_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ort TEXT,
  plz TEXT,
  kategorie_text TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, item_type, source_id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email_created
  ON password_reset_attempts(email, created_at DESC);

-- Abrechnungssystem: Kundenverwaltung für Experten
CREATE TABLE IF NOT EXISTS expert_students (
  id SERIAL PRIMARY KEY,
  expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (expert_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_expert_students_expert_id
  ON expert_students(expert_id);

CREATE INDEX IF NOT EXISTS idx_expert_students_student_id
  ON expert_students(student_id);

-- Abrechnungsinformationen pro Student
CREATE TABLE IF NOT EXISTS student_billing_info (
  id SERIAL PRIMARY KEY,
  expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  billing_strasse TEXT,
  iban TEXT,
  payment_method TEXT DEFAULT 'invoice',
  billing_cycle_day INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  notes JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (expert_id, student_id) REFERENCES expert_students(expert_id, student_id) ON DELETE CASCADE
);

-- Phase 2: Buchungssystem pro Schüler/Kunde
CREATE TABLE IF NOT EXISTS expert_student_bookings (
  id SERIAL PRIMARY KEY,
  expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  service_title TEXT NOT NULL,
  duration_minutes INTEGER,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  protection_fee_cents INTEGER NOT NULL DEFAULT 0,
  customer_total_cents INTEGER NOT NULL DEFAULT 0,
  expert_payout_cents INTEGER NOT NULL DEFAULT 0,
  provider_commission_bps INTEGER NOT NULL DEFAULT 0,
  customer_discount_bps INTEGER NOT NULL DEFAULT 0,
  final_fee_bps INTEGER NOT NULL DEFAULT 0,
  protection_model TEXT NOT NULL DEFAULT 'standard',
  expert_plan_key TEXT,
  customer_plan_key TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'offen',
  paid_at TIMESTAMP,
  paid_method TEXT,
  notes TEXT,
  billed_month DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE expert_student_bookings
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

ALTER TABLE expert_student_bookings
  ADD COLUMN IF NOT EXISTS paid_method TEXT;

CREATE INDEX IF NOT EXISTS idx_expert_student_bookings_expert_date
  ON expert_student_bookings(expert_id, booking_date DESC);

CREATE INDEX IF NOT EXISTS idx_expert_student_bookings_student
  ON expert_student_bookings(student_id, booking_date DESC);

CREATE TABLE IF NOT EXISTS expert_calendar_slots (
  id SERIAL PRIMARY KEY,
  expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  release_month TEXT,
  slot_start TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  service_title TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  booked_booking_id INTEGER REFERENCES expert_student_bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_calendar_slots_expert_student
  ON expert_calendar_slots(expert_id, student_id, slot_start DESC);

CREATE INDEX IF NOT EXISTS idx_expert_calendar_slots_student_status
  ON expert_calendar_slots(student_id, status, slot_start ASC);

-- Phase 3: Experten-Rechnungsdaten
CREATE TABLE IF NOT EXISTS expert_invoice_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  steuernummer TEXT DEFAULT '',
  ust_idnr TEXT DEFAULT '',
  kontoname TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  bic TEXT DEFAULT '',
  bankname TEXT DEFAULT '',
  tel TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  is_kleinunternehmer BOOLEAN DEFAULT TRUE,
  mwst_satz NUMERIC(5,2) DEFAULT 19.0,
  invoice_prefix TEXT DEFAULT 'RE',
  invoice_counter INTEGER DEFAULT 1,
  template_id INTEGER DEFAULT 1,
  brand_color TEXT DEFAULT '#10b981',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_service_plans (
  id SERIAL PRIMARY KEY,
  expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'einzelstunde',
  service_title TEXT NOT NULL DEFAULT 'Reitstunde',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  monthly_price_cents INTEGER,
  sessions_per_month INTEGER NOT NULL DEFAULT 4,
  cancellation_hours INTEGER NOT NULL DEFAULT 24,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (expert_id, student_id)
);

ALTER TABLE student_service_plans
  ADD COLUMN IF NOT EXISTS cancellation_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE student_service_plans
  ADD COLUMN IF NOT EXISTS max_cancellations_per_month INTEGER NOT NULL DEFAULT 0;

ALTER TABLE student_service_plans
  ADD COLUMN IF NOT EXISTS require_confirmation_each_booking BOOLEAN NOT NULL DEFAULT FALSE;

-- Plattform-Abomodell (Nutzer/Experte)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'nutzer',
  plan_key TEXT NOT NULL DEFAULT 'nutzer_free',
  payment_method TEXT NOT NULL DEFAULT 'sepa',
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  sepa_account_holder TEXT,
  sepa_iban TEXT,
  paypal_email TEXT,
  paypal_fee_cents INTEGER NOT NULL DEFAULT 0,
  homepage_marketing_until TIMESTAMP,
  started_at TIMESTAMP,
  next_charge_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
  ON user_subscriptions(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS user_subscription_invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  plan_key TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  invoice_month TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_at TIMESTAMP NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'offen',
  source TEXT NOT NULL DEFAULT 'subscription-cycle',
  notes TEXT,
  emailed_at TIMESTAMP,
  paid_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, invoice_month)
);

CREATE INDEX IF NOT EXISTS idx_user_subscription_invoices_user_due
  ON user_subscription_invoices(user_id, due_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_subscription_invoices_month
  ON user_subscription_invoices(invoice_month DESC, due_at DESC);

CREATE TABLE IF NOT EXISTS visibility_promotions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  scope TEXT NOT NULL,
  label TEXT NOT NULL,
  charge_cents INTEGER NOT NULL DEFAULT 0,
  included BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method TEXT,
  plan_key TEXT,
  starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE visibility_promotions
  ADD COLUMN IF NOT EXISTS scope TEXT;

UPDATE visibility_promotions
SET scope = 'angebote'
WHERE scope IS NULL OR LENGTH(TRIM(scope)) = 0;

ALTER TABLE visibility_promotions
  ALTER COLUMN scope SET DEFAULT 'angebote';

ALTER TABLE visibility_promotions
  ALTER COLUMN scope SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visibility_promotions_user_scope_end
  ON visibility_promotions(user_id, scope, ends_at DESC);

CREATE INDEX IF NOT EXISTS idx_visibility_promotions_scope_end
  ON visibility_promotions(scope, ends_at DESC);

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS early_access_granted_until TIMESTAMP;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT FALSE;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS founding_member_free_until TIMESTAMP;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS lifetime_free_access BOOLEAN DEFAULT FALSE;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS lifetime_discount_percent INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_founding_member
  ON user_subscriptions(is_founding_member, plan_key)
  WHERE is_founding_member = TRUE;

CREATE TABLE IF NOT EXISTS expert_calendar_availability (
  id SERIAL PRIMARY KEY,
  expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
  service_title TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  notes TEXT,
  repeat_until TIMESTAMP NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_calendar_availability_expert_dow
  ON expert_calendar_availability(expert_id, day_of_week, active DESC);

-- Team members for experts (linked accounts)
CREATE TABLE IF NOT EXISTS expert_team_members (
  id SERIAL PRIMARY KEY,
  expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (expert_id, member_user_id)
);

-- Horses for experts
CREATE TABLE IF NOT EXISTS expert_horses (
  id SERIAL PRIMARY KEY,
  expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
