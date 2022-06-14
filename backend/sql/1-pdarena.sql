CREATE DATABASE pdarena;
\c pdarena;

-- Table Structure
-- Primary Key
-- Creation Time
-- Creator User Id (if applicable)
-- Everything else

drop table if exists submission cascade;
create table submission(
  article_id bigserial primary key,
  creation_time bigint not null default extract(epoch from now()) * 1000,
  creator_user_id bigint not null,
  code string not null
);

drop table if exists tournament cascade;
create table tournament(
  article_id bigserial primary key,
  creation_time bigint not null default extract(epoch from now()) * 1000,
  creator_user_id bigint not null,
  public bool not null
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
drop table if exists matchup cascade;
create table matchup(
  matchup_id bigserial primary key,
  creation_time bigint not null default extract(epoch from now()) * 1000,
  article_id bigint not null references article(article_id),
  position bigint not null,
  variant bigint not null,
  section_text text not null,
  active bool not null
);

create view recent_matchup as
  select a_s.* from matchup a_s
  inner join (
   select max(matchup_id) id 
   from matchup 
   group by article_id, position, variant
  ) maxids
  on maxids.id = a_s.matchup_id;
