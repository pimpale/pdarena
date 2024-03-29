use serde::{Deserialize, Serialize};
use strum::AsRefStr;

use crate::request::TournamentSubmissionKind;

#[derive(Clone, Debug, Serialize, Deserialize, AsRefStr)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppError {
    NoCapability,
    SubmissionNonexistent,
    TournamentNonexistent,
    TournamentDataNRoundsInvalid,
    TournamentDataNMatchupsInvalid,
    TournamentDataTooManyMatches,
    SubmissionTooLong,
    TournamentSubmissionNotValidated,
    TournamentSubmissionTestcaseIncomplete,
    TournamentSubmissionTestcaseFails,
    TournamentArchived,
    StreamEndBeforeRequest,
    DecodeError,
    MethodNotAllowed,
    InternalServerError,
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
    pub n_rounds: i64,
    pub n_matchups: i64,
    pub active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TournamentSubmission {
    pub tournament_submission_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub tournament: Tournament,
    pub submission_id: i64,
    pub name: String,
    pub kind: TournamentSubmissionKind,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchResolutionLite {
    pub match_resolution_id: i64,
    pub creation_time: i64,
    pub submission_id: i64,
    pub opponent_submission_id: i64,
    pub round: i64,
    pub matchup: i64,
    pub defected: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchResolution {
    pub match_resolution_id: i64,
    pub creation_time: i64,
    pub submission_id: i64,
    pub opponent_submission_id: i64,
    pub round: i64,
    pub matchup: i64,
    pub defected: Option<bool>,
    pub stdout: String,
    pub stderr: String,
}


#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    pub service: String,
    pub version_major: i64,
    pub version_minor: i64,
    pub version_rev: i64,
}
