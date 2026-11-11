ALTER TABLE public.members ADD COLUMN IF NOT EXISTS due_day integer;
ALTER TABLE public.members ADD CONSTRAINT members_due_day_range CHECK (due_day BETWEEN 1 AND 31);
COMMENT ON COLUMN public.members.due_day IS 'Preferred monthly billing due day; NULL retains the existing local preference or default until saved.';
NOTIFY pgrst, 'reload schema';