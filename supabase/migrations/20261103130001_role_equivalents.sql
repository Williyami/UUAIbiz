-- Every policy checks has_role(..., 'admin') or has_role(..., 'member'), so
-- teaching has_role the equivalents gives board the admin perms and other the
-- business-team perms everywhere at once, without touching each policy.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'board')
        OR (_role = 'member' AND role = 'other')
      )
  )
$$;
