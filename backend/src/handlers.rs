use crate::request::TournamentSubmissionKind;
use crate::response::AppError;
use crate::run_code::RunCodeService;
use crate::SharedNotifyQueue;

use super::Db;
use auth_service_api::response::AuthError;
use auth_service_api::response::User;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc::unbounded_channel;
use warp::ws::Message;

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

use super::AppData;

pub fn report_postgres_err(e: tokio_postgres::Error) -> response::AppError {
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

pub fn report_base64_err(e: base64::DecodeError) -> response::AppError {
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
        n_matchups: tournament_data.n_matchups,
        n_rounds: tournament_data.n_rounds,
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
        matchup: match_resolution.matchup,
        defected: match_resolution.defected,
        stdout: match_resolution.stdout,
        stderr: match_resolution.stderr,
    })
}

async fn fill_match_resolution_lite(
    _con: &mut tokio_postgres::Client,
    match_resolution: MatchResolution,
) -> Result<response::MatchResolutionLite, response::AppError> {
    Ok(response::MatchResolutionLite {
        match_resolution_id: match_resolution.match_resolution_id,
        creation_time: match_resolution.creation_time,
        submission_id: match_resolution.submission_id,
        opponent_submission_id: match_resolution.opponent_submission_id,
        round: match_resolution.round,
        matchup: match_resolution.matchup,
        defected: match_resolution.defected,
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
    AppData {
        db, auth_service, ..
    }: AppData,
    props: request::SubmissionNewProps,
) -> Result<response::Submission, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    // validate code length
    if props.code.len() > 10000 {
        return Err(response::AppError::SubmissionTooLong);
    }

    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();

    let mut sp = con.transaction().await.map_err(report_postgres_err)?;

    // create submission
    let submission = submission_service::add(&mut sp, user.user_id, props.code.clone())
        .await
        .map_err(report_postgres_err)?;

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_submission(con, submission).await
}

// uses RunCode to do a match between two submissions
pub fn do_battle(
    db: Db,
    n_matchups: i64,
    n_rounds: i64,
    run_code_service: RunCodeService,
    submission: Submission,
    opponent_submission: Submission,
    notif_queue: SharedNotifyQueue,
) {
    for matchup in 0..n_matchups {
        tokio::task::spawn(do_matchup(
            db.clone(),
            matchup,
            n_rounds,
            run_code_service.clone(),
            submission.clone(),
            opponent_submission.clone(),
            notif_queue.clone(),
        ));
    }
}

// uses RunCode to do a match between two submissions
pub async fn do_matchup(
    db: Db,
    matchup: i64,
    n_rounds: i64,
    run_code_service: RunCodeService,
    submission: Submission,
    opponent_submission: Submission,
    notif_queue: SharedNotifyQueue,
) {
    let mut submission_defection_history = vec![];
    let mut opponent_submission_defection_history = vec![];

    for round in 0..n_rounds {
        let submission_match_resolution = execute_match(
            db.clone(),
            &submission,
            &opponent_submission,
            round,
            matchup,
            &opponent_submission_defection_history,
            &run_code_service,
            notif_queue.clone(),
        )
        .await
        .unwrap();

        let opponent_submission_match_resolution = execute_match(
            db.clone(),
            &opponent_submission,
            &submission,
            round,
            matchup,
            &submission_defection_history,
            &run_code_service,
            notif_queue.clone(),
        )
        .await
        .unwrap();

        submission_defection_history.push(submission_match_resolution.defected);
        opponent_submission_defection_history.push(opponent_submission_match_resolution.defected);
    }
}

async fn execute_match(
    db: Db,
    submission: &Submission,
    opponent_submission: &Submission,
    round: i64,
    matchup: i64,
    opponent_defection_history: &Vec<Option<bool>>,
    run_code_service: &RunCodeService,
    notif_queue: SharedNotifyQueue,
) -> Result<MatchResolution, AppError> {
    let opponent_defection_history_str = opponent_defection_history
        .into_iter()
        .map(|x| match x {
            None => "None",
            Some(true) => "True",
            Some(false) => "False",
        })
        .collect::<Vec<&str>>()
        .join(",");

    // create random names for submission and opponent submission
    let submission_file_name = format!("mod_{}", utils::random_string());
    let opponent_submission_file_name = format!("mod_{}", utils::random_string());

    let run_code = [
        String::from("#!/usr/bin/python3"),
        format!("import {} as Sub", submission_file_name),
        format!("import {} as Opp", opponent_submission_file_name),
        format!(
            "opp_defection_history = [{}]",
            opponent_defection_history_str
        ),
        String::from("defected = Sub.should_defect(Opp.should_defect, opp_defection_history)"),
        format!("exit(100 if defected else 101)"),
    ]
    .join("\n");

    let map = [
        (String::from("run"), run_code),
        (
            format!("{}.py", submission_file_name),
            submission.code.clone(),
        ),
        (
            format!("{}.py", opponent_submission_file_name),
            opponent_submission.code.clone(),
        ),
    ]
    .into_iter()
    .collect();

    let resp = run_code_service.send_multifile_submission(map).await?;

    let defected = match resp.exit_code {
        Some(100) => Some(true),
        Some(101) => Some(false),
        _ => None,
    };

    // create a match resolution in the case that the run_code callback fails
    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();
    let match_resolution = match_resolution_service::add(
        con,
        submission.submission_id,
        opponent_submission.submission_id,
        round,
        matchup,
        defected,
        resp.stdout,
        resp.stderr,
    )
    .await
    .map_err(report_postgres_err)?;

    // send to each queue in queue list, dropping queues that are dead
    notif_queue
        .lock()
        .await
        .retain(|sender| match sender.send(()) {
            Ok(()) => true,
            Err(_) => false,
        });

    Ok(match_resolution)
}

pub async fn tournament_new(
    AppData {
        db, auth_service, ..
    }: AppData,
    props: request::TournamentNewProps,
) -> Result<response::TournamentData, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    if props.n_rounds <= 0 {
        return Err(AppError::TournamentDataNRoundsInvalid);
    }
    if props.n_matchups <= 0 {
        return Err(AppError::TournamentDataNMatchupsInvalid);
    }

    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();

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
        props.n_rounds,
        props.n_matchups,
        true,
    )
    .await
    .map_err(report_postgres_err)?;

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_tournament_data(con, tournament_data).await
}

pub async fn tournament_data_new(
    AppData {
        db, auth_service, ..
    }: AppData,
    props: request::TournamentDataNewProps,
) -> Result<response::TournamentData, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    if props.n_rounds <= 0 {
        return Err(AppError::TournamentDataNRoundsInvalid);
    }
    if props.n_matchups <= 0 {
        return Err(AppError::TournamentDataNMatchupsInvalid);
    }

    if i64::saturating_mul(props.n_rounds, props.n_matchups) > 256 {
        return Err(AppError::TournamentDataTooManyMatches);
    }

    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();

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
        props.n_rounds,
        props.n_matchups,
        props.active,
    )
    .await
    .map_err(report_postgres_err)?;

    sp.commit().await.map_err(report_postgres_err)?;

    // return json
    fill_tournament_data(con, tournament_data).await
}

pub async fn tournament_submission_new(
    AppData {
        db,
        auth_service,
        run_code_service,
        match_resolution_inserted,
        ..
    }: AppData,
    props: request::TournamentSubmissionNewProps,
) -> Result<response::TournamentSubmission, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key).await?;

    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();

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
            // only become validate if there was no submission earlier
            let prev_submission =
                tournament_submission_service::get_recent_by_tournament_submission(
                    &mut sp,
                    tournament.tournament_id,
                    submission.submission_id,
                )
                .await
                .map_err(report_postgres_err)?;

            if prev_submission.is_none() {
                // do match for each testcase
                for testcase in tournament_submission_service::get_recent_by_kind(
                    &mut sp,
                    props.tournament_id,
                    &[request::TournamentSubmissionKind::Testcase],
                )
                .await
                .map_err(report_postgres_err)?
                {
                    let opponent_submission =
                        submission_service::get_by_submission_id(&mut sp, testcase.submission_id)
                            .await
                            .map_err(report_postgres_err)?
                            .ok_or(AppError::SubmissionNonexistent)?;

                    do_battle(
                        db.clone(),
                        tournament_data.n_matchups,
                        tournament_data.n_rounds,
                        run_code_service.clone(),
                        submission.clone(),
                        opponent_submission,
                        match_resolution_inserted.clone(),
                    );
                }
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

            if prev_submission.kind == TournamentSubmissionKind::Cancel
                || prev_submission.kind == TournamentSubmissionKind::Testcase
            {
                return Err(AppError::TournamentSubmissionNotValidated);
            }

            // if changing from validate to compete then do this
            if prev_submission.kind == TournamentSubmissionKind::Validate {
                // ensure that testcases have all passed
                for testcase in tournament_submission_service::get_recent_by_kind(
                    &mut sp,
                    props.tournament_id,
                    &[request::TournamentSubmissionKind::Testcase],
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

                    // ensure that there are at least tournament_data
                    if testcase_results.len()
                        < (tournament_data.n_rounds * tournament_data.n_matchups * 2) as usize
                    {
                        return Err(AppError::TournamentSubmissionTestcaseIncomplete);
                    }

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
                    &[request::TournamentSubmissionKind::Compete],
                )
                .await
                .map_err(report_postgres_err)?
                {
                    let opponent_submission =
                        submission_service::get_by_submission_id(&mut sp, opponent.submission_id)
                            .await
                            .map_err(report_postgres_err)?
                            .ok_or(AppError::SubmissionNonexistent)?;

                    do_battle(
                        db.clone(),
                        tournament_data.n_matchups,
                        tournament_data.n_rounds,
                        run_code_service.clone(),
                        submission.clone(),
                        opponent_submission,
                        match_resolution_inserted.clone(),
                    );
                }

                // also matchup against self
                do_battle(
                    db.clone(),
                    tournament_data.n_matchups,
                    tournament_data.n_rounds,
                    run_code_service.clone(),
                    submission.clone(),
                    submission.clone(),
                    match_resolution_inserted.clone(),
                );
            }
        }
        request::TournamentSubmissionKind::Testcase => {
            // if requester isn't creator of the tournament, reject
            if user.user_id != tournament.creator_user_id {
                return Err(response::AppError::Unauthorized);
            }

            // then do match for all validation and competition entries
            for opponent in tournament_submission_service::get_recent_by_kind(
                &mut sp,
                props.tournament_id,
                &[
                    request::TournamentSubmissionKind::Validate,
                    request::TournamentSubmissionKind::Compete,
                ],
            )
            .await
            .map_err(report_postgres_err)?
            {
                let opponent_submission =
                    submission_service::get_by_submission_id(&mut sp, opponent.submission_id)
                        .await
                        .map_err(report_postgres_err)?
                        .ok_or(AppError::SubmissionNonexistent)?;

                do_battle(
                    db.clone(),
                    tournament_data.n_matchups,
                    tournament_data.n_rounds,
                    run_code_service.clone(),
                    submission.clone(),
                    opponent_submission,
                    match_resolution_inserted.clone(),
                );
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
    AppData {
        db, auth_service, ..
    }: AppData,
    props: request::SubmissionViewProps,
) -> Result<Vec<response::Submission>, response::AppError> {
    // validate api key
    let user = get_user_if_api_key_valid(&auth_service, props.api_key.clone()).await?;

    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();
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
    AppData {
        db, auth_service, ..
    }: AppData,
    props: request::TournamentDataViewProps,
) -> Result<Vec<response::TournamentData>, response::AppError> {
    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();
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
    AppData {
        db, auth_service, ..
    }: AppData,
    props: request::TournamentSubmissionViewProps,
) -> Result<Vec<response::TournamentSubmission>, response::AppError> {
    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();
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
    AppData {
        db, auth_service, ..
    }: AppData,
    props: request::MatchResolutionViewProps,
) -> Result<Vec<response::MatchResolution>, response::AppError> {
    let con: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();
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

pub async fn tournament_submission_stream(
    AppData {
        db,
        auth_service,
        match_resolution_inserted,
        ..
    }: AppData,
    websocket: warp::ws::WebSocket,
) {
    tokio::pin!(websocket);

    // create multi-producer single consumer pair
    let (send, mut recv) = unbounded_channel();

    // push 1 notif inside the queue immediately (so that loop runs)
    send.send(()).unwrap();

    // push sending end into array
    match_resolution_inserted.lock().await.push(send);

    let result: Result<(), response::AppError> = try {
        let message = websocket
            .next()
            .await
            // socket closed cleanly
            .ok_or(response::AppError::StreamEndBeforeRequest)?
            // websocket errored out for some reason
            .map_err(|_| response::AppError::StreamEndBeforeRequest)?;
        let message_str = message
            .to_str()
            // message wasn't text
            .map_err(|_| response::AppError::StreamEndBeforeRequest)?;

        let props = serde_json::from_str::<request::TournamentSubmissionViewProps>(message_str)
            .map_err(|_| response::AppError::DecodeError)?;

        // initialize the next novel id to the one specified
        let mut next_new_id = props.min_id.unwrap_or(0);

        // return tournament_submissions
        'recv_loop: while let Some(()) = recv.recv().await {
            let client: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();

            // set the max id to the one specified at the end of the loop
            let mut adjusted_props = props.clone();
            adjusted_props.min_id = Some(next_new_id);

            // get data
            let tournament_submission =
                tournament_submission_service::query(&mut *client, adjusted_props)
                    .await
                    .map_err(report_postgres_err)?;

            for u in tournament_submission.into_iter() {
                if u.tournament_submission_id > next_new_id {
                    next_new_id = u.tournament_submission_id;
                }

                let json_str =
                    serde_json::to_string(&fill_tournament_submission(&mut *client, u).await?)
                        .expect("serde should have serialized json");

                // try to send array. If it fails then we close the websocket
                if let Err(_) = websocket.send(Message::text(json_str)).await {
                    break 'recv_loop;
                }
            }
        }

        return ();
    };
}

pub async fn match_resolution_lite_stream(
    AppData {
        db,
        auth_service,
        match_resolution_inserted,
        ..
    }: AppData,
    websocket: warp::ws::WebSocket,
) {
    tokio::pin!(websocket);

    // create multi-producer single consumer pair
    let (send, mut recv) = unbounded_channel();

    // push 1 notif inside the queue immediately (so that loop runs)
    send.send(()).unwrap();

    // push sending end into array
    match_resolution_inserted.lock().await.push(send);

    let result: Result<(), response::AppError> = try {
        let message = websocket
            .next()
            .await
            // socket closed cleanly
            .ok_or(response::AppError::StreamEndBeforeRequest)?
            // websocket errored out for some reason
            .map_err(|_| response::AppError::StreamEndBeforeRequest)?;

        let message_str = message
            .to_str()
            // message wasn't text
            .map_err(|_| response::AppError::StreamEndBeforeRequest)?;

        let props = serde_json::from_str::<request::MatchResolutionViewProps>(message_str)
            .map_err(|_| response::AppError::DecodeError)?;

        // validate that api key is valid

        // initialize the next novel id to the one specified
        let mut next_new_id = props.min_id.unwrap_or(0);

        // return match_resolutions
        'recv_loop: while let Some(()) = recv.recv().await {
            let client: &mut tokio_postgres::Client = &mut *db.get().await.unwrap();

            // set the max id to the one specified at the end of the loop
            let mut adjusted_props = props.clone();
            adjusted_props.min_id = Some(next_new_id);
            // get data
            let match_resolution = match_resolution_service::query(&mut *client, adjusted_props)
                .await
                .map_err(report_postgres_err)?;

            for u in match_resolution.into_iter() {
                if u.match_resolution_id > next_new_id {
                    next_new_id = u.match_resolution_id;
                }

                let json_str =
                    serde_json::to_string(&fill_match_resolution_lite(&mut *client, u).await?)
                        .expect("serde should have serialized json");

                // try to send array. If it fails then we close the websocket
                if let Err(_) = websocket.send(Message::text(json_str)).await {
                    break 'recv_loop;
                }
            }
        }
        return ();
    };
}
