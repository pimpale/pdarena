use crate::judge0::Judge0Service;
use crate::request::TournamentSubmissionKind;
use crate::response::AppError;

use super::Db;
use auth_service_api::client::AuthService;
use auth_service_api::response::AuthError;
use auth_service_api::response::User;
use tokio_postgres::GenericClient;

use super::request;
use super::response;

use super::db_types::*;
use super::utils;

use super::match_resolution_service;
use super::submission_service;
use super::tournament_data_service;
use super::tournament_service;
use super::tournament_submission_service;

use std::error::Error;

use super::Config;

pub fn report_postgres_err(e: tokio_postgres::Error) -> response::AppError {
    utils::log(utils::Event {
        msg: e.to_string(),
        source: e.source().map(|e| e.to_string()),
        severity: utils::SeverityKind::Error,
    });
    response::AppError::InternalServerError
}

pub fn report_zip_err(e: zip::result::ZipError) -> response::AppError {
    utils::log(utils::Event {
        msg: e.to_string(),
        source: e.source().map(|e| e.to_string()),
        severity: utils::SeverityKind::Error,
    });
    response::AppError::InternalServerError
}

pub fn report_io_err(e: std::io::Error) -> response::AppError {
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
        submission_id: tournament_submission.submission_id,
        tournament: fill_tournament(con, tournament).await?,
        name: tournament_submission.name,
        kind: tournament_submission.kind,
    })
}

async fn fill_match_resolution(
    _con: &mut tokio_postgres::Client,
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
    _judge0_service: Judge0Service,
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
    let submission = submission_service::add(&mut sp, user.user_id, props.code.clone())
        .await
        .map_err(report_postgres_err)?;

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_submission(con, submission).await
}

pub async fn match_resolution_callback(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    _judge0_service: Judge0Service,
    props: request::SubmissionNewProps,
) -> Result<(), response::AppError> {
    Ok(())
}

// uses Judge0 to do a match between two submissions
//
pub async fn do_match(
    con: &mut impl GenericClient,
    judge0_service: Judge0Service,
    submission_id: i64,
    opponent_submission_id: i64,
) -> Result<(), response::AppError> {
    // get biggest working match number
    let last_successful_match_round = match_resolution_service::get_last_successful_match_round(
        con,
        submission_id,
        opponent_submission_id,
    )
    .await
    .map_err(report_postgres_err)?;

    // Three states we could be in:
    // last_successful_match_round is None -> implies we are starting out, need to progress to next round
    // only sub_v_opp exists -> implies we are waiting for other one to complete
    // only opp_v_sub exists -> implies we are waiting for other one to complete
    // both opp_v_sub and sub_v_opp exist -> need to progress to next round

    if let Some(round) = last_successful_match_round {
        let sub_v_opp = match_resolution_service::get_recent_valid_by_submission_round(
            con,
            submission_id,
            opponent_submission_id,
            round,
        )
        .await
        .map_err(report_postgres_err)?;

        let opp_v_sub = match_resolution_service::get_recent_valid_by_submission_round(
            con,
            opponent_submission_id,
            submission_id,
            round,
        )
        .await
        .map_err(report_postgres_err)?;

        let should_wait = match (sub_v_opp, opp_v_sub) {
            (Some(_), None) => true,
            (None, Some(_)) => true,
            _ => false,
        };

        if should_wait {
            return Ok(());
        }
    }

    let next_round = last_successful_match_round.map_or(0, |x| x + 1);

    // if this is the last round do nothing
    if next_round > 30 {
        return Ok(());
    }

    send_match(
        con,
        submission_id,
        opponent_submission_id,
        next_round,
        &judge0_service,
    )
    .await?;
    send_match(
        con,
        opponent_submission_id,
        submission_id,
        next_round,
        &judge0_service,
    )
    .await?;
    return Ok(());
}

async fn send_match(
    con: &mut impl GenericClient,
    submission_id: i64,
    opponent_submission_id: i64,
    round: i64,
    judge0_service: &Judge0Service,
) -> Result<(), response::AppError> {
    // get code for submission and opponent submission
    let submission = submission_service::get_by_submission_id(con, submission_id)
        .await
        .map_err(report_postgres_err)?
        .ok_or(AppError::SubmissionNonexistent)?;

    let opponent_submission = submission_service::get_by_submission_id(con, opponent_submission_id)
        .await
        .map_err(report_postgres_err)?
        .ok_or(AppError::SubmissionNonexistent)?;

    // get opponent's history
    let opponent_defection_history = match_resolution_service::get_defection_history(
        con,
        opponent_submission_id,
        submission_id,
        round,
    )
    .await
    .map_err(report_postgres_err)?;

    let opponent_defection_history_str = opponent_defection_history
        .into_iter()
        .map(|x| match x {
            None => "None",
            Some(true) => "True",
            Some(false) => "False",
        })
        .collect::<Vec<&str>>()
        .join(",");

    // create a match resolution in the case that the judge0 callback fails
    match_resolution_service::add(
        con,
        submission_id,
        opponent_submission_id,
        round,
        None,
        String::new(),
        String::from("Judge0 Failed"),
    )
    .await
    .map_err(report_postgres_err)?;

    // create random names for submission and opponent submission
    let submission_file_name = format!("mod_{}", utils::random_string());
    let opponent_submission_file_name = format!("mod_{}", utils::random_string());

    let harness_code = [
        format!("import {} as Sub", submission_file_name),
        format!("import {} as Opp", opponent_submission_file_name),
        format!(
            "opp_defection_history = [{}]",
            opponent_defection_history_str
        ),
        String::from("result = Sub.should_defect(Opp.should_defect, opp_defection_history)"),
        String::from("exit(5000 if result else 5001)"),
    ]
    .join("\n");

    let run_code = ["#!/bin/bash", "exec python3 harness.py"].join("\n");

    let map = [
        (String::from("run"), run_code),
        (String::from("harness.py"), harness_code),
        (format!("{}.py", submission_file_name), submission.code),
        (
            format!("{}.py", opponent_submission_file_name),
            opponent_submission.code,
        ),
    ]
    .into_iter()
    .collect();

    let resp = judge0_service
        .send_multifile_submission(map, String::new())
        .await?;
    dbg!(resp);
    Ok(())
}

pub async fn tournament_new(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    _judge0_service: Judge0Service,
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
    _judge0_service: Judge0Service,
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
    judge0_service: Judge0Service,
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

    // validate submission is owned by correct user or tournament creator
    if user.user_id != submission.creator_user_id && user.user_id != tournament.creator_user_id {
        return Err(response::AppError::Unauthorized);
    }

    // validate that the tournament isn't archived
    let tournament_data =
        tournament_data_service::get_recent_by_tournament_id(&mut sp, props.tournament_id)
            .await
            .map_err(report_postgres_err)?
            .ok_or(response::AppError::TournamentNonexistent)?;

    if !tournament_data.active {
        return Err(response::AppError::TournamentArchived);
    }

    match props.kind {
        request::TournamentSubmissionKind::Validate => {
            // do match for each testcase
            for testcase in tournament_submission_service::get_recent_by_kind(
                &mut sp,
                props.tournament_id,
                request::TournamentSubmissionKind::Testcase,
            )
            .await
            .map_err(report_postgres_err)?
            {
                do_match(
                    &mut sp,
                    judge0_service.clone(),
                    submission.submission_id,
                    testcase.submission_id,
                )
                .await?;
            }
        }
        request::TournamentSubmissionKind::Compete => {
            // ensure validation entry exists
            let prev_submission =
                tournament_submission_service::get_recent_by_tournament_submission(
                    &mut sp,
                    tournament.tournament_id,
                    submission.submission_id,
                )
                .await
                .map_err(report_postgres_err)?
                .ok_or(AppError::TournamentSubmissionNotValidated)?;

            if prev_submission.kind != TournamentSubmissionKind::Validate {
                return Err(AppError::TournamentSubmissionNotValidated);
            }

            // ensure that testcases have all passed
            for testcase in tournament_submission_service::get_recent_by_kind(
                &mut sp,
                props.tournament_id,
                request::TournamentSubmissionKind::Testcase,
            )
            .await
            .map_err(report_postgres_err)?
            {
                let mut testcase_results = vec![];
                // there can't be any errors when the submission was judging the testcase
                testcase_results.append(
                    &mut match_resolution_service::get_recent_by_submission(
                        &mut sp,
                        props.submission_id,
                        testcase.submission_id,
                    )
                    .await
                    .map_err(report_postgres_err)?,
                );
                // there can't be any errors when the testcase was judging the submission
                testcase_results.append(
                    &mut match_resolution_service::get_recent_by_submission(
                        &mut sp,
                        testcase.submission_id,
                        props.submission_id,
                    )
                    .await
                    .map_err(report_postgres_err)?,
                );

                for result in testcase_results {
                    if result.defected.is_none() {
                        return Err(AppError::TournamentSubmissionTestcaseFails);
                    }
                }
            }

            // then do match for all other submission entries
            for opponent in tournament_submission_service::get_recent_by_kind(
                &mut sp,
                props.tournament_id,
                request::TournamentSubmissionKind::Compete,
            )
            .await
            .map_err(report_postgres_err)?
            {
                do_match(
                    &mut sp,
                    judge0_service.clone(),
                    submission.submission_id,
                    opponent.submission_id,
                )
                .await?;
            }
        }
        request::TournamentSubmissionKind::Testcase => {
            // then do match for all competition entries
            for opponent in tournament_submission_service::get_recent_by_kind(
                &mut sp,
                props.tournament_id,
                request::TournamentSubmissionKind::Compete,
            )
            .await
            .map_err(report_postgres_err)?
            {
                do_match(
                    &mut sp,
                    judge0_service.clone(),
                    opponent.submission_id,
                    submission.submission_id,
                )
                .await?;
            }
        }
        request::TournamentSubmissionKind::Cancel => {
            // do nothing
        }
    }

    // create tournament submission
    let tournament_submission = tournament_submission_service::add(
        &mut sp,
        user.user_id,
        submission.submission_id,
        tournament.tournament_id,
        props.name,
        props.kind,
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
    _judge0_service: Judge0Service,
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

pub async fn tournament_data_view(
    _config: Config,
    db: Db,
    auth_service: AuthService,
    _judge0_service: Judge0Service,
    props: request::TournamentDataViewProps,
) -> Result<Vec<response::TournamentData>, response::AppError> {
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
    _judge0_service: Judge0Service,
    props: request::TournamentSubmissionViewProps,
) -> Result<Vec<response::TournamentSubmission>, response::AppError> {
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
    _judge0_service: Judge0Service,
    props: request::MatchResolutionViewProps,
) -> Result<Vec<response::MatchResolution>, response::AppError> {
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
