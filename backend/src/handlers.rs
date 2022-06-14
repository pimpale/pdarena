use super::Db;
use auth_service_api::client::AuthService;
use auth_service_api::response::AuthError;
use auth_service_api::response::User;

use super::request;
use super::response;

use super::db_types::*;
use super::utils;

use super::article_data_service;
use super::article_section_service;
use super::article_service;

use std::error::Error;

use super::Config;

fn report_postgres_err(e: tokio_postgres::Error) -> response::AppError {
  utils::log(utils::Event {
    msg: e.to_string(),
    source: e.source().map(|e| e.to_string()),
    severity: utils::SeverityKind::Error,
  });
  response::AppError::InternalServerError
}

fn report_auth_err(e: AuthError) -> response::AppError {
  match e {
    AuthError::ApiKeyNonexistent => response::AppError::Unauthorized,
    AuthError::ApiKeyUnauthorized => response::AppError::Unauthorized,
    c => {
      let ae = match c {
        AuthError::InternalServerError => response::AppError::InternalServerError,
        AuthError::MethodNotAllowed => response::AppError::InternalServerError,
        AuthError::BadRequest => response::AppError::InternalServerError,
        AuthError::Network => response::AppError::InternalServerError,
        _ => response::AppError::Unknown,
      };

      utils::log(utils::Event {
        msg: ae.as_ref().to_owned(),
        source: Some(format!("auth service: {}", c.as_ref())),
        severity: utils::SeverityKind::Error,
      });

      ae
    }
  }
}

async fn fill_article(
  _con: &mut tokio_postgres::Client,
  article: Article,
) -> Result<response::Article, response::AppError> {
  Ok(response::Article {
    article_id: article.article_id,
    creation_time: article.creation_time,
    creator_user_id: article.creator_user_id,
  })
}

async fn fill_article_data(
  con: &mut tokio_postgres::Client,
  article_data: ArticleData,
) -> Result<response::ArticleData, response::AppError> {
  let article = article_service::get_by_article_id(con, article_data.article_id)
    .await
    .map_err(report_postgres_err)?
    .ok_or(response::AppError::ArticleNonexistent)?;

  Ok(response::ArticleData {
    article_data_id: article_data.article_data_id,
    creation_time: article_data.creation_time,
    creator_user_id: article_data.creator_user_id,
    article: fill_article(con, article).await?,
    title: article_data.title,
    duration_estimate: article_data.duration_estimate,
    active: article_data.active,
  })
}

async fn fill_article_section(
  con: &mut tokio_postgres::Client,
  article_section: ArticleSection,
) -> Result<response::ArticleSection, response::AppError> {
  let article = article_service::get_by_article_id(con, article_section.article_id)
    .await
    .map_err(report_postgres_err)?
    .ok_or(response::AppError::ArticleNonexistent)?;

  Ok(response::ArticleSection {
    article_section_id: article_section.article_section_id,
    creation_time: article_section.creation_time,
    creator_user_id: article_section.creator_user_id,
    article: fill_article(con, article).await?,
    position: article_section.position,
    variant: article_section.variant,
    section_text: article_section.section_text,
    active: article_section.active,
  })
}

pub async fn get_user_if_api_key_valid(
  auth_service: &auth_service_api::client::AuthService,
  api_key: String,
) -> Result<User, response::AppError> {
  auth_service
    .get_user_by_api_key_if_valid(api_key)
    .await
    .map_err(report_auth_err)
}

pub async fn article_new(
  _config: Config,
  db: Db,
  auth_service: AuthService,
  props: request::ArticleNewProps,
) -> Result<response::ArticleData, response::AppError> {
  // validate api key
  let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

  // validate duration estimate if exists
  if props.duration_estimate <= 0 {
      return Err(response::AppError::InvalidDuration);
  }

  let con = &mut *db.lock().await;

  let mut sp = con.transaction().await.map_err(report_postgres_err)?;

  // create article
  let article = article_service::add(&mut sp, user.user_id)
    .await
    .map_err(report_postgres_err)?;

  // create article data
  let article_data = article_data_service::add(
    &mut sp,
    user.user_id,
    article.article_id,
    props.title,
    props.duration_estimate,
    true,
  )
  .await
  .map_err(report_postgres_err)?;

  sp.commit().await.map_err(report_postgres_err)?;

  // return json
  fill_article_data(con, article_data).await
}

pub async fn article_data_new(
  _config: Config,
  db: Db,
  auth_service: AuthService,
  props: request::ArticleDataNewProps,
) -> Result<response::ArticleData, response::AppError> {
  // validate api key
  let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

  // validate duration 
    if props.duration_estimate  <= 0 {
      return Err(response::AppError::InvalidDuration);
    }

  let con = &mut *db.lock().await;

  let mut sp = con.transaction().await.map_err(report_postgres_err)?;

  // ensure that article exists and belongs to you
  let article = article_service::get_by_article_id(&mut sp, props.article_id)
    .await
    .map_err(report_postgres_err)?
    .ok_or(response::AppError::ArticleNonexistent)?;
  // validate article is owned by correct user
  if article.creator_user_id != user.user_id {
    return Err(response::AppError::ArticleNonexistent);
  }

  // create article data
  let article_data = article_data_service::add(
    &mut sp,
    user.user_id,
    article.article_id,
    props.title,
    props.duration_estimate,
    props.active,
  )
  .await
  .map_err(report_postgres_err)?;

  sp.commit().await.map_err(report_postgres_err)?;

  // return json
  fill_article_data(con, article_data).await
}

pub async fn article_section_new(
  _config: Config,
  db: Db,
  auth_service: AuthService,
  props: request::ArticleSectionNewProps,
) -> Result<response::ArticleSection, response::AppError> {
  // validate api key
  let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

  // validate that position is positive
  if props.position < 0 {
      return Err(response::AppError::InvalidPosition);
  }

  let con = &mut *db.lock().await;

  let mut sp = con.transaction().await.map_err(report_postgres_err)?;

  // ensure that article exists and belongs to you
  let article = article_service::get_by_article_id(&mut sp, props.article_id)
    .await
    .map_err(report_postgres_err)?
    .ok_or(response::AppError::ArticleNonexistent)?;
  // validate article is owned by correct user
  if article.creator_user_id != user.user_id {
    return Err(response::AppError::ArticleNonexistent);
  }

  // create article section
  let article_section = article_section_service::add(
    &mut sp,
    user.user_id,
    props.article_id,
    props.position,
    props.variant,
    props.section_text,
    props.active,
  )
  .await
  .map_err(report_postgres_err)?;

  sp.commit().await.map_err(report_postgres_err)?;

  // return json
  fill_article_section(con, article_section).await
}


pub async fn article_view(
  _config: Config,
  db: Db,
  auth_service: AuthService,
  props: request::ArticleViewProps,
) -> Result<Vec<response::Article>, response::AppError> {
  // validate api key
  let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

  let con = &mut *db.lock().await;
  // get users
  let articles = article_service::query(con, props)
    .await
    .map_err(report_postgres_err)?;

  // return articles
  let mut resp_articles = vec![];
  for u in articles
    .into_iter()
    .filter(|u| u.creator_user_id == user.user_id)
  {
    resp_articles.push(fill_article(con, u).await?);
  }

  Ok(resp_articles)
}

pub async fn article_data_view(
  _config: Config,
  db: Db,
  auth_service: AuthService,
  props: request::ArticleDataViewProps,
) -> Result<Vec<response::ArticleData>, response::AppError> {
  // validate api key
  let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

  let con = &mut *db.lock().await;
  // get users
  let article_data = article_data_service::query(con, props)
    .await
    .map_err(report_postgres_err)?;

  // return article_datas
  let mut resp_article_datas = vec![];
  for u in article_data
    .into_iter()
    .filter(|u| u.creator_user_id == user.user_id)
  {
    resp_article_datas.push(fill_article_data(con, u).await?);
  }

  Ok(resp_article_datas)
}

pub async fn article_section_view(
  _config: Config,
  db: Db,
  auth_service: AuthService,
  props: request::ArticleSectionViewProps,
) -> Result<Vec<response::ArticleSection>, response::AppError> {
  // validate api key
  let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

  let con = &mut *db.lock().await;
  // get users
  let article_section = article_section_service::query(con, props)
    .await
    .map_err(report_postgres_err)?;

  // return article_sections
  let mut resp_article_sections = vec![];
  for u in article_section
    .into_iter()
    .filter(|u| u.creator_user_id == user.user_id)
  {
    resp_article_sections.push(fill_article_section(con, u).await?);
  }

  Ok(resp_article_sections)
}


pub async fn article_data_public_view(
  _config: Config,
  db: Db,
  _: AuthService,
  props: request::ArticleDataViewPublicProps,
) -> Result<Vec<response::ArticleData>, response::AppError> {

  // rearrange props
  let props = request::ArticleDataViewProps {
    article_data_id: props.article_data_id,
    min_creation_time: props.min_creation_time,
    max_creation_time: props.max_creation_time,
    creator_user_id: props.creator_user_id,
    article_id: props.article_id,
    title: props.title,
    min_duration_estimate: props.min_duration_estimate,
    max_duration_estimate: props.max_duration_estimate,
    active: Some(true),
    only_recent: true,
    api_key: String::from(""),
  };

  let con = &mut *db.lock().await;
  // get users
  let article_data = article_data_service::query(con, props)
    .await
    .map_err(report_postgres_err)?;

  // return article_datas
  let mut resp_article_datas = vec![];
  for u in article_data
    .into_iter()
  {
    resp_article_datas.push(fill_article_data(con, u).await?);
  }


  Ok(resp_article_datas)
}

pub async fn article_section_public_view(
  _config: Config,
  db: Db,
  _: AuthService,
  props: request::ArticleSectionViewPublicProps,
) -> Result<Vec<response::ArticleSection>, response::AppError> {
  let con = &mut *db.lock().await;

  let props = request::ArticleSectionViewProps {
    article_section_id: props.article_section_id,
    min_creation_time: props.min_creation_time,
    max_creation_time: props.max_creation_time,
    creator_user_id: props.creator_user_id,
    article_id: props.article_id,
    position: props.position,
    variant: props.variant,
    active: Some(true),
    only_recent: true,
    api_key: String::from(""),
};

  // get users
  let article_section = article_section_service::query(con, props)
    .await
    .map_err(report_postgres_err)?;

  // return article_sections
  let mut resp_article_sections = vec![];
  for u in article_section
    .into_iter()
  {
    resp_article_sections.push(fill_article_section(con, u).await?);
  }


  Ok(resp_article_sections)
}
