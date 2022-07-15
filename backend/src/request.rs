use serde::{Deserialize, Serialize};

use strum::AsRefStr;

#[derive(Clone, Debug, Serialize, Deserialize, AsRefStr, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TournamentSubmissionKind {
  Compete,
  Validate,
  Testcase,
  Cancel,
}

impl TryFrom<u8> for TournamentSubmissionKind {
  type Error = u8;
  fn try_from(val: u8) -> Result<TournamentSubmissionKind, u8> {
    match val {
      x if x == TournamentSubmissionKind::Compete as u8 => Ok(TournamentSubmissionKind::Compete),
      x if x == TournamentSubmissionKind::Validate as u8 => Ok(TournamentSubmissionKind::Validate),
      x if x == TournamentSubmissionKind::Testcase as u8 => Ok(TournamentSubmissionKind::Testcase),
      x if x == TournamentSubmissionKind::Cancel as u8 => Ok(TournamentSubmissionKind::Cancel),
      x => Err(x),
    }
  }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionNewProps {
  pub code: String,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentNewProps {
  pub api_key: String,
  pub title: String,
  pub description: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentDataNewProps {
  pub tournament_id: i64,
  pub title: String,
  pub description: String,
  pub active: bool,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentSubmissionNewProps {
  pub tournament_id: i64,
  pub submission_id: i64,
  pub name: String,
  pub kind: TournamentSubmissionKind,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionViewProps {
  pub submission_id: Option<Vec<i64>>,
  pub min_creation_time: Option<i64>,
  pub max_creation_time: Option<i64>,
  pub creator_user_id: Option<Vec<i64>>,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentDataViewProps {
  pub tournament_data_id: Option<Vec<i64>>,
  pub min_creation_time: Option<i64>,
  pub max_creation_time: Option<i64>,
  pub creator_user_id: Option<Vec<i64>>,
  pub tournament_id: Option<Vec<i64>>,
  pub title: Option<Vec<String>>,
  pub active: Option<bool>,
  pub only_recent: bool,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentSubmissionViewProps{
  pub tournament_submission_id: Option<Vec<i64>>,
  pub min_creation_time: Option<i64>,
  pub max_creation_time: Option<i64>,
  pub creator_user_id: Option<Vec<i64>>,
  pub tournament_id: Option<Vec<i64>>,
  pub submission_id: Option<Vec<i64>>,
  pub kind: Option<TournamentSubmissionKind>,
  pub only_recent: bool,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchResolutionViewProps{
  pub min_creation_time: Option<i64>,
  pub max_creation_time: Option<i64>,
  pub match_resolution_id: Option<Vec<i64>>,
  pub submission_id: Option<Vec<i64>>,
  pub opponent_submission_id: Option<Vec<i64>>,
  pub round: Option<Vec<i64>>,
  pub api_key: String,
}
