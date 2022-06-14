#[derive(Clone, Debug)]
pub struct Article {
  pub article_id: i64,
  pub creation_time: i64,
  pub creator_user_id: i64,
}

#[derive(Clone, Debug)]
pub struct ArticleData {
  pub article_data_id: i64,
  pub creation_time: i64,
  pub creator_user_id: i64,
  pub article_id: i64,
  pub title: String,
  pub duration_estimate: i64,
  pub active: bool,
}

#[derive(Clone, Debug)]
pub struct ArticleSection {
  pub article_section_id: i64,
  pub creation_time: i64,
  pub creator_user_id: i64,
  pub article_id: i64,
  pub position: i64,
  pub variant: i64,
  pub section_text: String,
  pub active: bool,
}

