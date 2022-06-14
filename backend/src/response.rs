use serde::{Deserialize, Serialize};
use strum::AsRefStr;

#[derive(Clone, Debug, Serialize, Deserialize, AsRefStr)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppError {
  NoCapability,
  ArticleNonexistent,
  ArticleSectionNonexistent,
  InvalidDuration,
  InvalidPosition,
  DecodeError,
  InternalServerError,
  MethodNotAllowed,
  Unauthorized,
  BadRequest,
  NotFound,
  Network,
  Unknown,
}

impl std::fmt::Display for AppError {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", self.as_ref())
  }
}

impl std::error::Error for AppError {}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Article {
  pub article_id: i64,
  pub creation_time: i64,
  pub creator_user_id: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleData {
  pub article_data_id: i64,
  pub creation_time: i64,
  pub creator_user_id: i64,
  pub article: Article,
  pub title: String,
  pub duration_estimate: i64,
  pub active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleSection {
  pub article_section_id: i64,
  pub creation_time: i64,
  pub creator_user_id: i64,
  pub article: Article,
  pub position: i64,
  pub variant: i64,
  pub section_text: String,
  pub active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Info {
  pub service: String,
  pub version_major: i64,
  pub version_minor: i64,
  pub version_rev: i64,
}
