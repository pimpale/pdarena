use super::db_types::*;
use super::utils::current_time_millis;
use super::request;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for Article {
  // select * from article order only, otherwise it will fail
  fn from(row: tokio_postgres::Row) -> Article {
    Article {
      article_id: row.get("article_id"),
      creation_time: row.get("creation_time"),
      creator_user_id: row.get("creator_user_id"),
    }
  }
}

pub async fn add(
  con: &mut impl GenericClient,
  creator_user_id: i64,
) -> Result<Article, tokio_postgres::Error> {
  let creation_time = current_time_millis();

  let article_id = con
    .query_one(
      "INSERT INTO
       article(
           creation_time,
           creator_user_id
       )
       VALUES($1, $2)
       RETURNING article_id
      ",
      &[&creation_time, &creator_user_id],
    )
    .await?
    .get(0);

  // return article
  Ok(Article {
    article_id,
    creation_time,
    creator_user_id,
  })
}

pub async fn get_by_article_id(
  con: &mut impl GenericClient,
  article_id: i64,
) -> Result<Option<Article>, tokio_postgres::Error> {
  let result = con
    .query_opt("SELECT * FROM article WHERE article_id=$1", &[&article_id])
    .await?
    .map(|x| x.into());

  Ok(result)
}

pub async fn query(
  con: &mut impl GenericClient,
  props: request::ArticleViewProps,
) -> Result<Vec<Article>, tokio_postgres::Error> {
  let sql = "SELECT g.* FROM article g WHERE 1 = 1
     AND ($1::bigint IS NULL OR g.article_id = $1)
     AND ($2::bigint IS NULL OR g.creation_time >= $2)
     AND ($3::bigint IS NULL OR g.creation_time <= $3)
     AND ($4::bigint IS NULL OR g.creator_user_id = $4)
     ORDER BY g.article_id
     ";

  let stmnt = con.prepare(sql).await?;

  let results = con
    .query(
      &stmnt,
      &[
        &props.article_id,
        &props.min_creation_time,
        &props.max_creation_time,
        &props.creator_user_id,
      ],
    )
    .await?
    .into_iter()
    .map(|x| x.into())
    .collect();
  Ok(results)
}
