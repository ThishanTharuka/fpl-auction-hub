-- Add group_stage to stage_type enum
alter type stage_type add value if not exists 'group_stage';

-- Add group_name columns for group stage
alter table tournament_matches add column if not exists group_name text;

alter table tournament_standings add column if not exists group_name text;
