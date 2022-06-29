use super::handlers;
use super::response;
use super::response::AppError;
use super::utils;
use super::Config;
use super::Db;
use super::SERVICE_NAME;
use auth_service_api::client::AuthService;
use std::convert::Infallible;
use std::future::Future;
use warp::http::StatusCode;
use warp::Filter;

/// Helper to combine the multiple filters together with Filter::or, possibly boxing the types in
/// the process. This greatly helps the build times for `ipfs-http`.
/// https://github.com/seanmonstar/warp/issues/507#issuecomment-615974062
macro_rules! combine {
  ($x:expr, $($y:expr),+) => {{
      let filter = ($x).boxed();
      $( let filter = (filter.or($y)).boxed(); )+
      filter
  }}
}

/// The function that will show all ones to call
pub fn api(
    config: Config,
    db: Db,
    auth_service: AuthService,
) -> impl Filter<Extract = impl warp::Reply, Error = Infallible> + Clone {
    // public API
    combine!(
        api_info(),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "submission" / "new"),
            handlers::submission_new,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("match_resolution_callback"),
            handlers::match_resolution_callback,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "tournament" / "new"),
            handlers::tournament_new,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "tournament_data" / "new"),
            handlers::tournament_data_new,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "tournament_submission" / "new"),
            handlers::tournament_submission_new,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "submission" / "view"),
            handlers::submission_view,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "testcase_data" / "view"),
            handlers::testcase_data_view,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "tournament_data" / "view"),
            handlers::tournament_data_view,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "tournament_submission" / "view"),
            handlers::tournament_submission_view,
        ),
        adapter(
            config.clone(),
            db.clone(),
            auth_service.clone(),
            warp::path!("public" / "match_resolution" / "view"),
            handlers::match_resolution_view,
        )
    )
    .recover(handle_rejection)
}

fn api_info() -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let info = response::Info {
        service: SERVICE_NAME.to_owned(),
        version_major: 1,
        version_minor: 0,
        version_rev: 0,
    };
    warp::path!("public" / "info").map(move || warp::reply::json(&info))
}

// this function adapts a handler function to a warp filter
// it accepts an initial path filter
fn adapter<PropsType, ResponseType, F>(
    config: Config,
    db: Db,
    auth_service: AuthService,
    filter: impl Filter<Extract = (), Error = warp::Rejection> + Clone,
    handler: fn(Config, Db, AuthService, PropsType) -> F,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone
where
    F: Future<Output = Result<ResponseType, AppError>> + Send,
    PropsType: Send + serde::de::DeserializeOwned,
    ResponseType: Send + serde::ser::Serialize,
{
    // lets you pass in an arbitrary parameter
    fn with<T: Clone + Send>(t: T) -> impl Filter<Extract = (T,), Error = Infallible> + Clone {
        warp::any().map(move || t.clone())
    }

    filter
        .and(with(config))
        .and(with(db))
        .and(with(auth_service))
        .and(warp::body::json())
        .and_then(move |config, db, auth_service, props| async move {
            handler(config, db, auth_service, props)
                .await
                .map_err(app_error)
        })
        .map(|x| warp::reply::json(&Ok::<ResponseType, ()>(x)))
}

// This function receives a `Rejection` and tries to return a custom
// value, otherwise simply passes the rejection along.
async fn handle_rejection(err: warp::Rejection) -> Result<impl warp::Reply, Infallible> {
    let code;
    let message;

    if err.is_not_found() {
        code = StatusCode::NOT_FOUND;
        message = AppError::NotFound;
    } else if err
        .find::<warp::filters::body::BodyDeserializeError>()
        .is_some()
    {
        message = AppError::DecodeError;
        code = StatusCode::BAD_REQUEST;
    } else if err.find::<warp::reject::MethodNotAllowed>().is_some() {
        code = StatusCode::METHOD_NOT_ALLOWED;
        message = AppError::MethodNotAllowed;
    } else if let Some(AppErrorRejection(app_error)) = err.find() {
        code = StatusCode::BAD_REQUEST;
        message = app_error.clone();
    } else {
        // We should have expected this... Just log and say its a 500
        utils::log(utils::Event {
            msg: "intercepted unknown error kind".to_owned(),
            source: format!("{:#?}", err),
            severity: utils::SeverityKind::Error,
        });
        code = StatusCode::INTERNAL_SERVER_ERROR;
        message = AppError::Unknown;
    }

    Ok(warp::reply::with_status(
        warp::reply::json(&Err::<(), AppError>(message)),
        code,
    ))
}

// This type represents errors that we can generate
// These will be automatically converted to a proper string later
#[derive(Debug)]
pub struct AppErrorRejection(pub AppError);
impl warp::reject::Reject for AppErrorRejection {}

fn app_error(app_error: AppError) -> warp::reject::Rejection {
    warp::reject::custom(AppErrorRejection(app_error))
}
