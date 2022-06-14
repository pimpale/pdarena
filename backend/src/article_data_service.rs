use super::db_types::*;
use super::utils::current_time_millis;
use tokio_postgres::GenericClient;
use super::request;

impl From<tokio_postgres::row::Row> for ArticleData {
  // select * from article_data order only, otherwise it will fail
  fn from(row: tokio_postgres::Row) -> ArticleData {
    ArticleData {
      article_data_id: row.get("article_data_id"),
      creation_time: row.get("creation_time"),
      creator_user_id: row.get("creator_user_id"),
      article_id: row.get("article_id"),
      title: row.get("title"),
      duration_estimate: row.get("duration_estimate"),
      active:row.get("active"),
    }
  }
}

pub async fn add(
  con: &mut impl GenericClient,
  creator_user_id: i64,
  article_id: i64,
  title: String,
  duration_estimate: i64,
  active: bool,
) -> Result<ArticleData, tokio_postgres::Error> {
  let creation_time = current_time_millis();

  let article_data_id = con
    .query_one(
      "INSERT INTO
       article_data(
           creation_time,
           creator_user_id,
           article_id,
           title,
           duration_estimate,
           active
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING article_data_id
      ",
      &[
        &creation_time,
        &creator_user_id,
        &article_id,
        &title,
        &duration_estimate,
        &active,
      ],
    )
    .await?
    .get(0);

  // return article_data
  Ok(ArticleData {
    article_data_id,
    creation_time,
    creator_user_id,
    article_id,
    title,
    duration_estimate,
    active,
  })
}

pub async fn get_by_article_data_id(
  con: &mut impl GenericClient,
  article_data_id: i64,
) -> Result<Option<ArticleData>, tokio_postgres::Error> {
  let result = con
    .query_opt(
      "SELECT * FROM article_data WHERE article_data_id=$1",
      &[&article_data_id],
    )
    .await?
    .map(|x| x.into());
  Ok(result)
}

pub async fn query(
  con: &mut impl GenericClient,
  props: request::ArticleDataViewProps,
) -> Result<Vec<ArticleData>, tokio_postgres::Error> {
  let sql = [
    if props.only_recent {
      "SELECT ad.* FROM recent_article_data ad"
    } else {
      "SELECT ad.* FROM article_data ad"
    },
    " INNER JOIN article g ON ad.article_id = g.article_id",
    " WHERE 1 = 1",
    " AND ($1::bigint[]  IS NULL OR ad.article_data_id = ANY($1))",
    " AND ($2::bigint    IS NULL OR ad.creation_time >= $2)",
    " AND ($3::bigint    IS NULL OR ad.creation_time <= $3)",
    " AND ($4::bigint[]  IS NULL OR ad.creator_user_id = ANY($4))",
    " AND ($5::bigint[]  IS NULL OR ad.article_id = ANY($5))",
    " AND ($6::text[]    IS NULL OR ad.title = ANY($6))",
    " AND ($7::bigint    IS NULL OR ad.duration_estimate >= $7)",
    " AND ($8::bigint    IS NULL OR ad.duration_estimate <= $8)",
    " AND ($9::bool      IS NULL OR ad.active = $9)",
    " ORDER BY ad.article_data_id",
  ]
  .join("\n");

  let stmnt = con.prepare(&sql).await?;

  let results = con
    .query(
      &stmnt,
      &[
        &props.article_data_id,
        &props.min_creation_time,
        &props.max_creation_time,
        &props.creator_user_id,
        &props.article_id,
        &props.title,
        &props.min_duration_estimate,
        &props.max_duration_estimate,
        &props.active,
      ],
    )
    .await?
    .into_iter()
    .map(|row| row.into())
    .collect();

  Ok(results)
}
