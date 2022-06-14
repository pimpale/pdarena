use super::db_types::*;
use super::utils::current_time_millis;
use std::convert::From;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for ArticleSection {
  // select * from article_section order only, otherwise it will fail
  fn from(row: tokio_postgres::Row) -> ArticleSection {
    ArticleSection {
      article_section_id: row.get("article_section_id"),
      creation_time: row.get("creation_time"),
      creator_user_id: row.get("creator_user_id"),
      article_id: row.get("article_id"),
      position: row.get("position"),
      variant: row.get("variant"),
      section_text: row.get("section_text"),
      active: row.get("active"),
    }
  }
}

// TODO we need to figure out a way to make scheduled and unscheduled articles work better
pub async fn add(
  con: &mut impl GenericClient,
  creator_user_id: i64,
  article_id: i64,
  position: i64,
  variant: i64,
  section_text: String,
  active: bool,
) -> Result<ArticleSection, tokio_postgres::Error> {
  let creation_time = current_time_millis();

  let article_section_id = con
    .query_one(
      "INSERT INTO
       article_section(
           creation_time,
           creator_user_id,
           article_id,
           position,
           variant,
           section_text,
           active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING article_section_id
      ",
      &[
        &creation_time,
        &creator_user_id,
        &article_id,
        &position,
        &variant,
        &section_text,
        &active,
      ],
    )
    .await?
    .get(0);

  Ok(ArticleSection {
    article_section_id,
    creation_time,
    creator_user_id,
    article_id,
    position,
    variant,
    section_text,
    active,
  })
}

pub async fn get_by_article_section_id(
  con: &mut impl GenericClient,
  article_section_id: &i64,
) -> Result<Option<ArticleSection>, tokio_postgres::Error> {
  let result = con
    .query_opt(
      "SELECT * FROM article_section WHERE article_section_id=$1",
      &[&article_section_id],
    )
    .await?
    .map(|x| x.into());

  Ok(result)
}

pub async fn query(
  con: &mut impl GenericClient,
  props: super::request::ArticleSectionViewProps,
) -> Result<Vec<ArticleSection>, tokio_postgres::Error> {
  let sql = [
    if props.only_recent {
      "SELECT ase.* FROM recent_article_section ase"
    } else {
      "SELECT ase.* FROM article_section ase"
    },
    " WHERE 1 = 1",
    " AND ($1::bigint[] IS NULL OR ase.article_section_id = ANY($1))",
    " AND ($2::bigint   IS NULL OR ase.creation_time >= $2)",
    " AND ($3::bigint   IS NULL OR ase.creation_time <= $3)",
    " AND ($4::bigint[] IS NULL OR ase.creator_user_id = ANY($4))",
    " AND ($5::bigint[] IS NULL OR ase.article_id = ANY($5))",
    " AND ($6::bigint[] IS NULL OR ase.position = ANY($6))",
    " AND ($7::bigint[] IS NULL OR ase.variant = ANY($7))",
    " AND ($8::bool     IS NULL OR ase.active = $8)",
    " ORDER BY ase.article_section_id",
  ]
  .join("\n");

  let stmnt = con.prepare(&sql).await?;

  let results = con
    .query(
      &stmnt,
      &[
        &props.article_section_id,
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
