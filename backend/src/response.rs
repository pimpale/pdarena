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
pub struct Submission {
    pub submission_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub code: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Testcase {
    pub testcase_data_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub submission_id: i64,
    pub active: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tournament {
    pub tournament_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentData {
    pub tournament_data_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub tournament: Tournament,
    pub title: String,
    pub description: String,
    pub active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentSubmission {
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub submission_id: i64,
    pub tournament: Tournament,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchResolution {
    pub match_resolution_id: i64,
    pub creation_time: i64,
    pub submission_id: i64,
    pub opponent_submission_id: i64,
    pub round: i64,
    pub defected: Option<i64>,
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
