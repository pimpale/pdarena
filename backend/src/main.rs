#![feature(try_blocks)]
use clap::Parser;
use run_code::RunCodeService;
use std::error::Error;
use std::str::FromStr;
use warp::Filter;

use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::mpsc::UnboundedSender;

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
}

pub type Db = deadpool_postgres::Pool;

pub type SharedNotifyQueue = Arc<Mutex<Vec<UnboundedSender<()>>>>;

#[derive(Clone)]
pub struct AppData {
    pub db: Db,
    pub site_external_url: String,
    pub database_url: String,
    pub match_resolution_inserted: SharedNotifyQueue,
    pub tournament_submission_inserted: SharedNotifyQueue,
    pub auth_service: AuthService,
    pub run_code_service: RunCodeService,
}

#[tokio::main]
async fn main() -> Result<(), ()> {
    let Opts {
        database_url,
        site_external_url,
        auth_service_url,
        pythonbox_service_url,
        port,
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
    let auth_service = AuthService::new(&auth_service_url).await;

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

    let data = AppData {
        site_external_url,
        database_url,
        db: pool,
        match_resolution_inserted: Arc::new(Mutex::new(vec![])),
        tournament_submission_inserted: Arc::new(Mutex::new(vec![])),
        auth_service,
        run_code_service,
    };

    let api = api::api(data);

    warp::serve(api.with(log)).run(([0, 0, 0, 0], port)).await;

    return Ok(());
}
