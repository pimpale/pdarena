use super::db_types::*;
use super::utils::current_time_millis;
use std::convert::From;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for Matchup {
  // select * from matchup order only, otherwise it will fail
  fn from(row: tokio_postgres::Row) -> Matchup {
    Matchup {
      creation_time: row.get("creation_time"),
      creator_user_id: row.get("tournament_id"),
      a_submission_id: row.get("a_submission_id"),
      b_submission_id: row.get("b_submission_id"),
    }
  }
}

// TODO we need to figure out a way to make scheduled and unscheduled articles work better
pub async fn add(
  con: &mut impl GenericClient,
  tournament_id: i64,
  a_submission_id: i64,
  b_submission_id: i64,
) -> Result<Matchup, tokio_postgres::Error> {
  let creation_time = current_time_millis();

  let row = con
    .query_one(
      "INSERT INTO
       matchup(
           tournament_id,
           a_submission_id,
           b_submission_id
       )
       VALUES ($1, $2, $3)
       RETURNING creation_time
      ",
      &[
        &tournament_id,
        &a_submission_id,
        &b_submission_id,
      ],
    )
    .await?;

  Ok(Matchup {
    creation_time: row.get(0),
    tournament_id,
    a_submission_id,
    b_submission_id,
  })
}

pub async fn query(
  con: &mut impl GenericClient,
  props: super::request::MatchupViewProps,
) -> Result<Vec<Matchup>, tokio_postgres::Error> {
  let sql = [
    "SELECT ase.* FROM matchup ase",
    " WHERE 1 = 1",
    " AND ($1::bigint[] IS NULL OR ase.matchup_id = ANY($1))",
    " AND ($2::bigint   IS NULL OR ase.creation_time >= $2)",
    " AND ($3::bigint   IS NULL OR ase.creation_time <= $3)",
    " AND ($4::bigint[] IS NULL OR ase.creator_user_id = ANY($4))",
    " AND ($5::bigint[] IS NULL OR ase.article_id = ANY($5))",
    " AND ($6::bigint[] IS NULL OR ase.position = ANY($6))",
    " AND ($7::bigint[] IS NULL OR ase.variant = ANY($7))",
    " AND ($8::bool     IS NULL OR ase.active = $8)",
    " ORDER BY ase.matchup_id",
  ]
  .join("\n");

  let stmnt = con.prepare(&sql).await?;

  let results = con
    .query(
      &stmnt,
      &[
        &props.matchup_id,
        &props.min_creation_time,
        &props.max_creation_time,
        &props.creator_user_id,
        &props.article_id,
        &props.position,
        &props.variant,
        &props.active,
      ],
    )
    .await?
    .into_iter()
    .map(|row| row.into())
    .collect();

  Ok(results)
}
