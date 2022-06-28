use super::db_types::*;
use super::utils::current_time_millis;
use super::request;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for Submission {
  // select * from submission order only, otherwise it will fail
  fn from(row: tokio_postgres::Row) -> Submission {
    Submission {
      submission_id: row.get("submission_id"),
      creation_time: row.get("creation_time"),
      creator_user_id: row.get("creator_user_id"),
      code: row.get("code"),
    }
  }
}

pub async fn add(
  con: &mut impl GenericClient,
  creator_user_id: i64,
  code: String,
) -> Result<Submission, tokio_postgres::Error> {
  let row = con
    .query_one(
      "INSERT INTO
       submission(
           creator_user_id,
           code
       )
       VALUES($1, $2)
       RETURNING submission_id, creation_time
      ",
      &[&creator_user_id, &code],
    )
    .await?;

  // return submission
  Ok(Submission {
    submission_id: row.get(0),
    creation_time: row.get(1),
    creator_user_id,
    code
  })
}

pub async fn get_by_submission_id(
  con: &mut impl GenericClient,
  submission_id: i64,
) -> Result<Option<Submission>, tokio_postgres::Error> {
  let result = con
    .query_opt("SELECT * FROM submission WHERE submission_id=$1", &[&submission_id])
    .await?
    .map(|x| x.into());
  Ok(result)
}

