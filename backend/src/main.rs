#![feature(try_blocks)]
use clap::Parser;
use std::error::Error;
use std::str::FromStr;
use warp::Filter;

use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::sync::mpsc;
use tokio::sync::Mutex;

mod utils;

use auth_service_api::client::AuthService;

// judge0
mod run_code;

// response and request
mod request;
mod response;

// db web stuff
mod match_resolution_service;
mod submission_service;
mod tournament_data_service;
mod tournament_service;
mod tournament_submission_service;

mod api;
mod db_types;
mod handlers;

static MAX_TIME: f32 = 1.0;
static SERVICE_NAME: &str = "pdarena-service";

#[derive(Parser, Clone)]
struct Opts {
    #[clap(long)]
    site_external_url: String,
    #[clap(long)]
    database_url: String,
    #[clap(long)]
    auth_service_url: String,
    #[clap(long)]
    pythonbox_service_url: String,
    #[clap(long)]
    port: u16,
    #[clap(long)]
    workers: u16,
}

pub type Db = deadpool_postgres::Pool;

#[derive(Clone, Debug, PartialEq)]
pub struct MatchupTask {
    pub matchup_num: i64,
    pub n_rounds: i64,
    pub submission_id: i64,
    pub opponent_submission_id: i64,
}

#[derive(Clone)]
pub struct AppData {
    pub db: Db,
    pub site_external_url: String,
    pub match_resolution_insert_tx: broadcast::Sender<response::MatchResolutionLite>,
    pub tournament_submission_insert_tx: broadcast::Sender<response::TournamentSubmission>,
    pub matchup_task_tx: mpsc::UnboundedSender<MatchupTask>,
    pub auth_service: AuthService,
}

#[tokio::main]
async fn main() -> Result<(), ()> {
    let Opts {
        database_url,
        site_external_url,
        auth_service_url,
        pythonbox_service_url,
        port,
        workers,
    } = Opts::parse();

    let postgres_config = tokio_postgres::Config::from_str(&database_url).map_err(|e| {
        utils::log(utils::Event {
            msg: e.to_string(),
            source: e.source().map(|x| x.to_string()),
            severity: utils::SeverityKind::Fatal,
        })
    })?;

    let mgr = deadpool_postgres::Manager::from_config(
        postgres_config,
        tokio_postgres::NoTls,
        deadpool_postgres::ManagerConfig {
            recycling_method: deadpool_postgres::RecyclingMethod::Fast,
        },
    );

    let pool = deadpool_postgres::Pool::builder(mgr)
        .max_size(16)
        .build()
        .map_err(|e| {
            utils::log(utils::Event {
                msg: e.to_string(),
                source: e.source().map(|x| x.to_string()),
                severity: utils::SeverityKind::Fatal,
            })
        })?;

    // open connection to auth service
    let auth_service = AuthService::new(&auth_service_url);

    // open connection to judge0 service
    let run_code_service = run_code::RunCodeService::new(&pythonbox_service_url).await;

    let log = warp::log::custom(|info| {
        // Use a log macro, or slog, or println, or whatever!
        utils::log(utils::Event {
            msg: info.method().to_string(),
            source: Some(info.path().to_string()),
            severity: utils::SeverityKind::Info,
        });
    });

    // its ok if it lags because we do the whole query all over again
    let (match_resolution_insert_tx, _) = broadcast::channel(1000);
    let (tournament_submission_insert_tx, _) = broadcast::channel(1000);

    // submit queue
    let (matchup_task_tx, matchup_task_rx) = mpsc::unbounded_channel();
    let matchup_task_rx = Arc::new(Mutex::new(matchup_task_rx));

    // vector of currently processing tasks
    let ongoing_tasks = Arc::new(Mutex::new(vec![]));

    // start workers
    for _ in 0..workers {
        tokio::task::spawn(handlers::matchup_runner(
            pool.clone(),
            run_code_service.clone(),
            matchup_task_rx.clone(),
            match_resolution_insert_tx.clone(),
            ongoing_tasks.clone(),
        ));
    }

    let data = AppData {
        site_external_url,
        db: pool,
        match_resolution_insert_tx,
        tournament_submission_insert_tx,
        matchup_task_tx,
        auth_service,
    };

    let api = api::api(data);

    warp::serve(api.with(log)).run(([0, 0, 0, 0], port)).await;

    return Ok(());
}
