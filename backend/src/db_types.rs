use super::request::TournamentSubmissionKind;

#[derive(Clone, Debug)]
pub struct Submission {
    pub submission_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub code: String,
}

#[derive(Clone, Debug)]
pub struct Tournament {
    pub tournament_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
}

#[derive(Clone, Debug)]
pub struct TournamentData {
    pub tournament_data_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub tournament_id: i64,
    pub title: String,
    pub description: String,
    pub active: bool,
}

#[derive(Clone, Debug)]
pub struct TournamentSubmission {
    pub tournament_submission_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub tournament_id: i64,
    pub submission_id: i64,
    pub name: String,
    pub kind: TournamentSubmissionKind,
}

#[derive(Clone, Debug)]
pub struct MatchResolution {
    pub match_resolution_id: i64,
    pub submission_id: i64,
    pub opponent_submission_id: i64,
    pub round: i64,
    pub creation_time: i64,
    pub defected: Option<bool>,
    pub stdout: String,
    pub stderr: String,
}
