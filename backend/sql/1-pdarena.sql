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
  code string not null
);

drop table if exists testcase_data cascade;
create table testcase_data(
  testcase_data_id bigserial primary key,
  creation_time bigint not null default extract(epoch from now()) * 1000,
  creator_user_id bigint not null,
  submission_id bigint not null references submission(submission_id),
  active bool not null
);

create view recent_testcase_data as
  select td.* from testcase_data td
  inner join (
   select max(testcase_data_id) id 
   from testcase_data 
   group by submission_id
  ) maxids
  on maxids.id = td.testcase_data_id;


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
  select td.* from tournament_data td
  inner join (
   select max(tournament_data_id) id 
   from tournament_data 
   group by tournament_id
  ) maxids
  on maxids.id = td.tournament_data_id;

drop table if exists tournament_submission cascade;
create table tournament_submission(
  creation_time bigint not null default extract(epoch from now()) * 1000,
  submission_id bigint not null references submission(submission_id),
  tournament_id bigint not null references tournament(tournament_id),
  creator_user_id bigint not null,
  primary key (submission_id, tournament_id)
);

-- a specific match resolution between two programs
drop table if exists match_resolution cascade;
create table matchup_resolution (
  creation_time bigint not null default extract(epoch from now()) * 1000,
  submission_id bigint not null references submission(submission_id),
  opponent_submission_id bigint not null references submission(submission_id),
  round bigint not null,
  defected bool,
  stdout text not null,
  stderr text not null,
  attempt bigint not null,
  primary key (submission_id, opponent_submission_id, round, attempt)
);

