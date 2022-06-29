use super::Db;
use auth_service_api::client::AuthService;
use auth_service_api::response::AuthError;
use auth_service_api::response::User;

use super::request;
use super::response;

use super::db_types::*;
use super::utils;

use super::match_resolution_service;
use super::submission_service;
use super::testcase_data_service;
use super::tournament_data_service;
use super::tournament_service;
use super::tournament_submission_service;

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

async fn fill_submission(
    _con: &mut tokio_postgres::Client,
    submission: Submission,
) -> Result<response::Submission, response::AppError> {
    Ok(response::Submission {
        submission_id: submission.submission_id,
        creation_time: submission.creation_time,
        creator_user_id: submission.creator_user_id,
        code: submission.code,
    })
}

async fn fill_testcase_data(
    con: &mut tokio_postgres::Client,
    testcase: TestcaseData,
) -> Result<response::TestcaseData, response::AppError> {
    Ok(response::TestcaseData {
        testcase_data_id: testcase.testcase_data_id,
        creation_time: testcase.creation_time,
        creator_user_id: testcase.creator_user_id,
        submission_id: testcase.submission_id,
        active: testcase.active,
    })
}

async fn fill_tournament(
    _con: &mut tokio_postgres::Client,
    tournament: Tournament,
) -> Result<response::Tournament, response::AppError> {
    Ok(response::Tournament {
        tournament_id: tournament.tournament_id,
        creation_time: tournament.creation_time,
        creator_user_id: tournament.creator_user_id,
    })
}

async fn fill_tournament_data(
    con: &mut tokio_postgres::Client,
    tournament_data: TournamentData,
) -> Result<response::TournamentData, response::AppError> {
    let tournament = tournament_service::get_by_tournament_id(con, tournament_data.tournament_id)
        .await
        .map_err(report_postgres_err)?
        .ok_or(response::AppError::TournamentNonexistent)?;

    Ok(response::TournamentData {
        tournament_data_id: tournament_data.tournament_data_id,
        creation_time: tournament_data.creation_time,
        creator_user_id: tournament_data.creator_user_id,
        tournament: fill_tournament(con, tournament).await?,
        title: tournament_data.title,
        description: tournament_data.description,
        active: tournament_data.active,
    })
}

async fn fill_tournament_submission(
    con: &mut tokio_postgres::Client,
    tournament_submission: TournamentSubmission,
) -> Result<response::TournamentSubmission, response::AppError> {
    let tournament =
        tournament_service::get_by_tournament_id(con, tournament_submission.tournament_id)
            .await
            .map_err(report_postgres_err)?
            .ok_or(response::AppError::TournamentNonexistent)?;

    Ok(response::TournamentSubmission {
        tournament_submission_id: tournament_submission.tournament_submission_id,
        creation_time: tournament_submission.creation_time,
        creator_user_id: tournament_submission.creator_user_id,
        tournament: fill_tournament(con, tournament).await?,
        submission_id: tournament_submission.submission_id,
    })
}

async fn fill_match_resolution(
    con: &mut tokio_postgres::Client,
    match_resolution: MatchResolution,
) -> Result<response::MatchResolution, response::AppError> {
    Ok(response::MatchResolution {
        match_resolution_id: match_resolution.match_resolution_id,
        creation_time: match_resolution.creation_time,
        submission_id: match_resolution.submission_id,
        opponent_submission_id: match_resolution.opponent_submission_id,
        round: match_resolution.round,
        defected: match_resolution.defected,
        stdout: match_resolution.stdout,
        stderr: match_resolution.stderr,
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

pub async fn submission_new(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::SubmissionNewProps,
) -> Result<response::Submission, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    // validate code length
    if props.code.len() > 10000 {
        return Err(response::AppError::SubmissionTooLong);
    }

    let con = &mut *db.lock().await;

    let mut sp = con.transaction().await.map_err(report_postgres_err)?;

    // create submission
    let submission = submission_service::add(&mut sp, user.user_id, props.code)
        .await
        .map_err(report_postgres_err)?;

    // Enumerate all current testcases
    let testcase_datas = testcase_data_service::get_recent(&mut sp)
        .await
        .map_err(report_postgres_err)?;

    for testcase_data in testcase_datas {
        // create a null matchup (this will be replaced by a callback eventually)
        let match_resolution = match_resolution_service::add(
            &mut sp,
            submission.submission_id,
            testcase_data.submission_id,
            0,
            None,
            String::new(),
            String::from("Judge0 Failed"),
        )
        .await
        .map_err(report_postgres_err)?;
    }

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_submission(con, submission).await
}

pub async fn match_resolution_callback(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::TestcaseDataNewProps,
) -> Result<response::TestcaseData, response::AppError> {
    
}



pub async fn testcase_data_new(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::TestcaseDataNewProps,
) -> Result<response::TestcaseData, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    // TODO: verify user is authorized to make a testcase

    let con = &mut *db.lock().await;

    let mut sp = con.transaction().await.map_err(report_postgres_err)?;

    // ensure that submission exists and belongs to you
    let submission = submission_service::get_by_submission_id(&mut sp, props.submission_id)
        .await
        .map_err(report_postgres_err)?
        .ok_or(response::AppError::SubmissionNonexistent)?;

    // create testcase data
    let testcase_data =
        testcase_data_service::add(&mut sp, user.user_id, submission.submission_id, true)
            .await
            .map_err(report_postgres_err)?;

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_testcase_data(con, testcase_data).await
}

pub async fn tournament_new(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::TournamentNewProps,
) -> Result<response::TournamentData, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    let con = &mut *db.lock().await;

    let mut sp = con.transaction().await.map_err(report_postgres_err)?;

    // create tournament
    let tournament = tournament_service::add(&mut sp, user.user_id)
        .await
        .map_err(report_postgres_err)?;

    // create tournament data
    let tournament_data = tournament_data_service::add(
        &mut sp,
        user.user_id,
        tournament.tournament_id,
        props.title,
        props.description,
        true,
    )
    .await
    .map_err(report_postgres_err)?;

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_tournament_data(con, tournament_data).await
}

pub async fn tournament_data_new(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::TournamentDataNewProps,
) -> Result<response::TournamentData, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    let con = &mut *db.lock().await;

    let mut sp = con.transaction().await.map_err(report_postgres_err)?;

    // ensure that tournament exists and belongs to you
    let tournament = tournament_service::get_by_tournament_id(&mut sp, props.tournament_id)
        .await
        .map_err(report_postgres_err)?
        .ok_or(response::AppError::TournamentNonexistent)?;
    // validate tournament is owned by correct user
    if tournament.creator_user_id != user.user_id {
        return Err(response::AppError::TournamentNonexistent);
    }

    // create tournament data
    let tournament_data = tournament_data_service::add(
        &mut sp,
        user.user_id,
        tournament.tournament_id,
        props.title,
        props.description,
        props.active,
    )
    .await
    .map_err(report_postgres_err)?;

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_tournament_data(con, tournament_data).await
}

pub async fn tournament_submission_new(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::TournamentSubmissionNewProps,
) -> Result<response::TournamentSubmission, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    let con = &mut *db.lock().await;

    let mut sp = con.transaction().await.map_err(report_postgres_err)?;

    // ensure that tournament exists
    let tournament = tournament_service::get_by_tournament_id(&mut sp, props.tournament_id)
        .await
        .map_err(report_postgres_err)?
        .ok_or(response::AppError::TournamentNonexistent)?;

    // ensure that submission exists and belongs to you
    let submission = submission_service::get_by_submission_id(&mut sp, props.submission_id)
        .await
        .map_err(report_postgres_err)?
        .ok_or(response::AppError::SubmissionNonexistent)?;

    // validate submission is owned by correct user
    if submission.creator_user_id != user.user_id {
        return Err(response::AppError::SubmissionNonexistent);
    }

    // create article section
    let tournament_submission = tournament_submission_service::add(
        &mut sp,
        user.user_id,
        submission.submission_id,
        tournament.tournament_id,
    )
    .await
    .map_err(report_postgres_err)?;

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_tournament_submission(con, tournament_submission).await
}

pub async fn submission_view(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::SubmissionViewProps,
) -> Result<Vec<response::Submission>, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

    let con = &mut *db.lock().await;
    // get users
    let submissions = submission_service::query(con, props)
        .await
        .map_err(report_postgres_err)?;

    // return submissions
    let mut resp_submissions = vec![];
    for u in submissions
        .into_iter()
        .filter(|u| u.creator_user_id == user.user_id)
    {
        resp_submissions.push(fill_submission(con, u).await?);
    }

    Ok(resp_submissions)
}

pub async fn testcase_data_view(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::TestcaseDataViewProps,
) -> Result<Vec<response::TestcaseData>, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

    let con = &mut *db.lock().await;
    // get users
    let testcase_data = testcase_data_service::query(con, props)
        .await
        .map_err(report_postgres_err)?;

    // return testcase_datas
    let mut resp_testcase_datas = vec![];
    for u in testcase_data.into_iter() {
        resp_testcase_datas.push(fill_testcase_data(con, u).await?);
    }

    Ok(resp_testcase_datas)
}

pub async fn tournament_data_view(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::TournamentDataViewProps,
) -> Result<Vec<response::TournamentData>, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

    let con = &mut *db.lock().await;
    // get users
    let tournament_data = tournament_data_service::query(con, props)
        .await
        .map_err(report_postgres_err)?;

    // return tournament_datas
    let mut resp_tournament_datas = vec![];
    for u in tournament_data.into_iter() {
        resp_tournament_datas.push(fill_tournament_data(con, u).await?);
    }

    Ok(resp_tournament_datas)
}

pub async fn tournament_submission_view(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::TournamentSubmissionViewProps,
) -> Result<Vec<response::TournamentSubmission>, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

    let con = &mut *db.lock().await;
    // get users
    let tournament_submission = tournament_submission_service::query(con, props)
        .await
        .map_err(report_postgres_err)?;

    // return tournament_submissions
    let mut resp_tournament_submissions = vec![];
    for u in tournament_submission.into_iter() {
        resp_tournament_submissions.push(fill_tournament_submission(con, u).await?);
    }

    Ok(resp_tournament_submissions)
}

pub async fn match_resolution_view(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    props: request::MatchResolutionViewProps,
) -> Result<Vec<response::MatchResolution>, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

    let con = &mut *db.lock().await;
    // get users
    let match_resolution = match_resolution_service::query(con, props)
        .await
        .map_err(report_postgres_err)?;

    // return match_resolutions
    let mut resp_match_resolutions = vec![];
    for u in match_resolution.into_iter() {
        resp_match_resolutions.push(fill_match_resolution(con, u).await?);
    }

    Ok(resp_match_resolutions)
}
