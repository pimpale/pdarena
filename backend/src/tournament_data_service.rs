use super::db_types::*;
use super::utils::current_time_millis;
use tokio_postgres::GenericClient;
use super::request;

impl From<tokio_postgres::row::Row> for TournamentData {
  // select * from tournament_data order only, otherwise it will fail
  fn from(row: tokio_postgres::Row) -> TournamentData {
    TournamentData {
      tournament_data_id: row.get("tournament_data_id"),
      creation_time: row.get("creation_time"),
      creator_user_id: row.get("creator_user_id"),
      tournament_id: row.get("tournament_id"),
      title: row.get("title"),
      duration_estimate: row.get("duration_estimate"),
      active:row.get("active"),
    }
  }
}

pub async fn add(
  con: &mut impl GenericClient,
  creator_user_id: i64,
  tournament_id: i64,
  title: String,
  description: String,
  active: bool,
) -> Result<TournamentData, tokio_postgres::Error> {
  let row = con
    .query_one(
      "INSERT INTO
       tournament_data(
           creator_user_id,
           tournament_id,
           title,
           description,
           active
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING tournament_data_id, creation_time
      ",
      &[
        &creator_user_id,
        &tournament_id,
        &title,
        &description,
        &active,
      ],
    )
    .await?;

  // return tournament_data
  Ok(TournamentData {
    tournament_data_id: row.get(0),
    creation_time: row.get(1),
    creator_user_id,
    tournament_id,
    title,
    description,
    active,
  })
}

pub async fn query(
  con: &mut impl GenericClient,
  props: request::TournamentDataViewProps,
) -> Result<Vec<TournamentData>, tokio_postgres::Error> {
  let sql = [
    if props.only_recent {
      "SELECT td.* FROM recent_tournament_data td"
    } else {
      "SELECT td.* FROM tournament_data td"
    },
    " WHERE 1 = 1",
    " AND ($1::bigint[]  IS NULL OR td.tournament_data_id = ANY($1))",
    " AND ($2::bigint    IS NULL OR td.creation_time >= $2)",
    " AND ($3::bigint    IS NULL OR td.creation_time <= $3)",
    " AND ($4::bigint[]  IS NULL OR td.creator_user_id = ANY($4))",
    " AND ($5::bigint[]  IS NULL OR td.tournament_id = ANY($5))",
    " AND ($6::text[]    IS NULL OR td.title = ANY($6))",
    " AND ($7::bool      IS NULL OR td.active = $7)",
    " ORDER BY td.tournament_data_id",
  ]
  .join("\n");

  let stmnt = con.prepare(&sql).await?;

  let results = con
    .query(
      &stmnt,
      &[
        &props.tournament_data_id,
        &props.min_creation_time,
        &props.max_creation_time,
        &props.creator_user_id,
        &props.tournament_id,
        &props.title,
        &props.active,
      ],
    )
    .await?
    .into_iter()
    .map(|row| row.into())
    .collect();

  Ok(results)
}
