CREATE DATABASE pdarena;
\c pdarena;

-- Table Structure
-- Primary Key
-- Creation Time
-- Creator User Id (if applicable)
-- Everything else

drop table if exists submission cascade;
create table submission(
  submission_id bigserial primary key,
  creation_time bigint not null default extract(epoch from now()) * 1000,
  creator_user_id bigint not null,
  is_testcase bigint not null,
  code string not null
);

drop table if exists tournament cascade;
create table tournament(
  tournament_id bigserial primary key,
  creation_time bigint not null default extract(epoch from now()) * 1000,
  creator_user_id bigint not null
);

-- invariant: tournament_id is valid
drop table if exists tournament_data cascade;
create table tournament_data(
  tournament_data_id bigserial primary key,
  creation_time bigint not null default extract(epoch from now()) * 1000,
  creator_user_id bigint not null,
  tournament_id bigint not null references tournament(tournament_id),
  -- tournament title
  title text not null,
  -- tournament description
  description text  not null,
  -- is the tournament still visible
  active bool not null
);

create view recent_tournament_data as
  select ad.* from tournament_data ad
  inner join (
   select max(tournament_data_id) id 
   from tournament_data 
   group by tournament_id
  ) maxids
  on maxids.id = ad.tournament_data_id;

-- matchup between two programs
-- should create match_resolutions for the matchup
drop table if exists matchup cascade;
create table matchup(
  creation_time bigint not null default extract(epoch from now()) * 1000,
  tournament_id bigint not null references tournament(tournament_id),
  a_submission_id bigint not null references submission(submission_id),
  b_submission_id bigint not null references submission(submission_id),
  primary key (tournament_id, a_submission_id, b_submission_id)
);

-- a specific match resolution between two programs
drop table if exists match_resolution cascade;
create table matchup_resolution (
  submission_id bigint not null references submission(submission_id),
  opponent_submission_id bigint not null references submission(submission_id),
  round bigint not null,
  creation_time bigint not null default extract(epoch from now()) * 1000,
  defected bool,
  stdout text not null,
  stderr text not null,
  primary key (submission_id, opponent_submission_id, round)
);

