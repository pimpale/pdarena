use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionNewProps {
  pub code: String,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestcaseDataNewProps {
  pub submission_id: i64,
  pub active: bool,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentNewProps {
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentDataNewProps {
  pub tournament_id: i64,
  pub title: String,
  pub description: i64,
  pub active: bool,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentSubmissionNewProps {
  pub tournament_id: i64,
  pub submission_id: i64,
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
pub struct TestcaseDataViewProps{
  pub testcase_data_id: Option<Vec<i64>>,
  pub min_creation_time: Option<i64>,
  pub max_creation_time: Option<i64>,
  pub creator_user_id: Option<Vec<i64>>,
  pub submission_id: Option<Vec<i64>>,
  pub active: Option<bool>,
  pub only_recent: bool,
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
  pub min_creation_time: Option<i64>,
  pub max_creation_time: Option<i64>,
  pub creator_user_id: Option<Vec<i64>>,
  pub submission_id: Option<Vec<i64>>,
  pub tournament_id: Option<Vec<i64>>,
  pub api_key: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchResolutionViewProps{
  pub min_creation_time: Option<i64>,
  pub max_creation_time: Option<i64>,
  pub match_resolution_id: Option<Vec<i64>>,
  pub creator_user_id: Option<Vec<i64>>,
  pub submission_id: Option<Vec<i64>>,
  pub opponent_submission_id: Option<Vec<i64>>,
  pub round: Option<Vec<i64>>,
  pub api_key: String,
}

