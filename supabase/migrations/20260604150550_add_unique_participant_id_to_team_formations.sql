ALTER TABLE public.team_formations
  ADD CONSTRAINT team_formations_participant_id_unique UNIQUE (participant_id);
