-- Finance ledger: the money that isn't attached to an event.
--
-- Event economics already live on public.events (revenue_from_partner,
-- cost_to_us, food_cost). This table holds everything else — membership money,
-- merch, equipment, software, grants — plus balance corrections.
--
-- Amounts are stored SIGNED so the balance is a plain SUM with no CASE: income
-- is positive, expenses negative, and an adjustment carries whichever sign the
-- correction needs. The check constraint keeps the sign and the kind agreeing,
-- so a mistyped expense can't quietly inflate the balance.

CREATE TYPE public.finance_kind AS ENUM ('Income', 'Expense', 'Adjustment');

CREATE TYPE public.finance_category AS ENUM (
  'Partnership', 'Event', 'Merch', 'Equipment', 'Food', 'Travel',
  'Software', 'Grant', 'Membership', 'Other'
);

CREATE TABLE public.finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  kind public.finance_kind NOT NULL,
  category public.finance_category NOT NULL DEFAULT 'Other',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT finance_entries_amount_matches_kind CHECK (
    (kind = 'Income'     AND amount > 0) OR
    (kind = 'Expense'    AND amount < 0) OR
    (kind = 'Adjustment' AND amount <> 0)
  ),
  CONSTRAINT finance_entries_description_not_blank CHECK (btrim(description) <> '')
);

CREATE INDEX finance_entries_entry_date_idx ON public.finance_entries (entry_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view finance entries" ON public.finance_entries
  FOR SELECT TO authenticated USING (true);

-- Editors handle day-to-day income and expenses. Adjustments rewrite the
-- balance, so they are admin-only — enforced here rather than by hiding a
-- button, which is a convenience and never the control.
CREATE POLICY "Editors can manage finance entries" ON public.finance_entries
  FOR ALL TO authenticated
  USING (
    public.is_editor(auth.uid())
    AND (kind <> 'Adjustment' OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    public.is_editor(auth.uid())
    AND (kind <> 'Adjustment' OR public.has_role(auth.uid(), 'admin'))
  );

CREATE TRIGGER finance_entries_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
