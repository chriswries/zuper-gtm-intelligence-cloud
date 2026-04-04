
-- RLS policies for users table
CREATE POLICY "Authenticated users can view all users"
  ON public.users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS policies for bots table
CREATE POLICY "Authenticated users full access to bots"
  ON public.bots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS policies for connectors table
CREATE POLICY "Authenticated users full access to connectors"
  ON public.connectors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS policies for bot_connectors table
CREATE POLICY "Authenticated users can view bot_connectors"
  ON public.bot_connectors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert bot_connectors"
  ON public.bot_connectors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bot_connectors"
  ON public.bot_connectors FOR DELETE TO authenticated USING (true);

-- RLS policies for tool_definitions table
CREATE POLICY "Authenticated users full access to tool_definitions"
  ON public.tool_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS policies for activity_log table
CREATE POLICY "Authenticated users can view activity_log"
  ON public.activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert activity_log"
  ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- RLS policies for jobs table
CREATE POLICY "Authenticated users can view jobs"
  ON public.jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON public.jobs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON public.jobs FOR UPDATE TO authenticated USING (true);

-- RLS policies for audit_log table
CREATE POLICY "Authenticated users can view audit_log"
  ON public.audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert audit_log"
  ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'admin'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
