#[derive(Clone, Debug)]
pub struct Submission {
    pub submission_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub reference: bool,
    pub code: String,
}

#[derive(Clone, Debug)]
pub struct Tournament {
    pub tournamenta_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub public: bool,
}

#[derive(Clone, Debug)]
pub struct ArticleData {
    pub tournament_data_id: i64,
    pub creation_time: i64,
    pub creator_user_id: i64,
    pub tournament_id: i64,
    pub title: String,
    pub description: String,
    pub active: bool,
}

#[derive(Clone, Debug)]
pub struct Matchup {
    pub a_submission_id: Vec<i64>,
    pub b_submission_id: Vec<i64>,
    pub creation_time: i64,
    pub a_defected: Option<bool>,
    pub b_defected: Option<bool>,
    pub a_defected: i64,
    pub b_defected: i64,
    pub section_text: String,
    pub active: bool,
}
