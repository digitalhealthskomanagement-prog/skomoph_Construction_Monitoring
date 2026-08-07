CREATE TABLE public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid REFERENCES public.phases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  mitigation text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','monitoring','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.risks TO anon, authenticated;
GRANT ALL ON public.risks TO service_role;

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read risks" ON public.risks FOR SELECT USING (true);

CREATE INDEX risks_phase_id_idx ON public.risks(phase_id);