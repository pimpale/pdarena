use super::db_types::*;
use std::convert::From;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for MatchResolution {
    // select * from match_resolution order only, otherwise it will fail
    fn from(row: tokio_postgres::Row) -> MatchResolution {
        MatchResolution {
            match_resolution_id: row.get("match_resolution_id"),
            submission_id: row.get("submission_id"),
            opponent_submission_id: row.get("opponent_submission_id"),
            round: row.get("round"),
            matchup: row.get("matchup"),
            creation_time: row.get("creation_time"),
            defected: row.get("defected"),
            stdout: row.get("stdout"),
            stderr: row.get("stderr"),
        }
    }
}

pub async fn add(
    con: &mut impl GenericClient,
    submission_id: i64,
    opponent_submission_id: i64,
    round: i64,
    matchup: i64,
    defected: Option<bool>,
    stdout: String,
    stderr: String,
) -> Result<MatchResolution, tokio_postgres::Error> {
    let row = con
        .query_one(
            "INSERT INTO
             match_resolution(
                 submission_id,
                 opponent_submission_id,
                 round,
                 matchup,
                 defected,
                 stdout,
                 stderr
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING match_resolution_id, creation_time
            ",
            &[
                &submission_id,
                &opponent_submission_id,
                &round,
                &matchup,
                &defected,
                &stdout,
                &stderr,
            ],
        )
        .await?;

    Ok(MatchResolution {
        match_resolution_id: row.get(0),
        creation_time: row.get(1),
        submission_id,
        opponent_submission_id,
        round,
        matchup,
        defected,
        stdout,
        stderr,
    })
}

pub async fn get_recent_by_submission(
    con: &mut impl GenericClient,
    submission_id: i64,
    opponent_submission_id: i64,
) -> Result<Vec<MatchResolution>, tokio_postgres::Error> {
    let sql = [
        "SELECT mr.* FROM recent_match_resolution mr",
        "WHERE 1 = 1",
        "AND mr.submission_id = $1",
        "AND mr.opponent_submission_id = $2",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query(&stmnt, &[&submission_id, &opponent_submission_id])
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}

// returns the last valid submission with the given submission ids and round
pub async fn get_recent_valid_by_submission_round(
    con: &mut impl GenericClient,
    submission_id: i64,
    opponent_submission_id: i64,
    round: i64,
) -> Result<Option<MatchResolution>, tokio_postgres::Error> {
    let sql = [
        "SELECT mr.* FROM recent_match_resolution mr",
        "WHERE 1 = 1",
        "AND mr.submission_id = $1",
        "AND mr.opponent_submission_id = $2",
        "AND mr.round = $3",
        "AND mr.defected IS NOT NULL",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query_opt(&stmnt, &[&submission_id, &opponent_submission_id, &round])
        .await?
        .map(|row| row.into());

    Ok(results)
}

pub async fn get_last_successful_match_round(
    con: &mut impl GenericClient,
    submission_id: i64,
    opponent_submission_id: i64,
) -> Result<Option<i64>, tokio_postgres::Error> {
    let sql = [
        "SELECT MAX(mr.round)",
        "FROM recent_match_resolution mr",
        "WHERE 1 = 1",
        "AND mr.submission_id = $1",
        "AND mr.opponent_submission_id = $2",
        "AND mr.defected IS NOT NULL",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query_opt(&stmnt, &[&submission_id, &opponent_submission_id])
        .await?
        .map(|row| row.get(0));

    Ok(results)
}


pub async fn get_defection_history(
    con: &mut impl GenericClient,
    submission_id: i64,
    opponent_submission_id: i64,
    round: i64,
) -> Result<Vec<Option<bool>>, tokio_postgres::Error> {
    let sql = [
        "SELECT mr.defected",
        "FROM recent_match_resolution mr",
        "WHERE 1 = 1",
        "AND mr.submission_id = $1",
        "AND mr.opponent_submission_id = $2",
        "AND mr.round < $3",
        "ORDER BY mr.round"
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query(&stmnt, &[&submission_id, &opponent_submission_id, &round])
        .await?
        .into_iter()
        .map(|row| row.get(0))
        .collect();

    Ok(results)
}

pub async fn query(
    con: &mut impl GenericClient,
    props: super::request::MatchResolutionViewProps,
) -> Result<Vec<MatchResolution>, tokio_postgres::Error> {
    let sql = [
        "SELECT mr.* FROM recent_match_resolution mr",
        "WHERE 1 = 1",
        "AND ($1::bigint   IS NULL OR mr.creation_time >= $1)",
        "AND ($2::bigint   IS NULL OR mr.creation_time <= $2)",
        "AND ($3::bigint   IS NULL OR mr.match_resolution_id >= $3)",
        "AND ($4::bigint   IS NULL OR mr.match_resolution_id <= $4)",
        "AND ($5::bigint[] IS NULL OR mr.match_resolution_id = ANY($5))",
        "AND ($6::bigint[] IS NULL OR mr.submission_id = ANY($6))",
        "AND ($7::bigint[] IS NULL OR mr.opponent_submission_id = ANY($7))",
        "AND ($8::bigint[] IS NULL OR mr.round = ANY($8))",
        "AND ($9::bigint[] IS NULL OR mr.matchup = ANY($9))",
        "ORDER BY mr.match_resolution_id",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query(
            &stmnt,
            &[
                &props.min_creation_time,
                &props.max_creation_time,
                &props.min_id,
                &props.max_id,
                &props.match_resolution_id,
                &props.submission_id,
                &props.opponent_submission_id,
                &props.round,
                &props.matchup,
            ],
        )
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}
