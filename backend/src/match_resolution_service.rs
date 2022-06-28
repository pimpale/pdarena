use super::db_types::*;
use super::utils::current_time_millis;
use std::convert::From;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for MatchResolution {
    // select * from match_resolution order only, otherwise it will fail
    fn from(row: tokio_postgres::Row) -> MatchResolution {
        MatchResolution {
            submission_id: row.get("submission_id"),
            opponent_submission_id: row.get("opponent_submission_id"),
            round: row.get("round"),
            creation_time: row.get("creation_time"),
            defected: row.get("defected"),
            stdout: row.get("stdout"),
            stderr: row.get("stderr"),
            attempt: row.get("attempt"),
        }
    }
}

pub async fn add(
    con: &mut impl GenericClient,
    submission_id: i64,
    opponent_submission_id: i64,
    round: i64,
    defected: bool,
    stdout: String,
    stderr: String,
    attempt: i64,
) -> Result<MatchResolution, tokio_postgres::Error> {
    let creation_time = current_time_millis();

    let row = con
        .query_one(
            "INSERT INTO
             match_resolution(
                 submission_id,
                 opponent_submission_id,
                 round,
                 defected,
                 stdout,
                 stderr,
                 attempt
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING creation_time
            ",
            &[
                &submission_id,
                &opponent_submission_id,
                &round,
                &defected,
                &stdout,
                &stderr,
                &attempt,
            ],
        )
        .await?;

    Ok(MatchResolution {
        creation_time: row.get(0),
        submission_id,
        opponent_submission_id,
        round,
        defected,
        stdout,
        stderr,
        attempt,
    })
}

pub async fn query(
    con: &mut impl GenericClient,
    props: super::request::MatchResolutionViewProps,
) -> Result<Vec<MatchResolution>, tokio_postgres::Error> {
    let sql = [
        "SELECT mr.* FROM match_resolution mr",
        " WHERE 1 = 1",
        " AND ($1::bigint   IS NULL OR mr.creation_time >= $1)",
        " AND ($2::bigint   IS NULL OR mr.creation_time <= $2)",
        " AND ($3::bigint[] IS NULL OR mr.submission_id = ANY($3))",
        " AND ($4::bigint[] IS NULL OR mr.opponent_submission_id = ANY($4))",
        " AND ($5::bigint[] IS NULL OR mr.round = ANY($5))",
        " AND ($6::bigint[] IS NULL OR mr.attempt = ANY($6))",
        " ORDER BY mr.submission_id, mr.opponent_submission_id, mr.round, mr.attempt",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query(
            &stmnt,
            &[
                &props.min_creation_time,
                &props.max_creation_time,
                &props.submission_id,
                &props.opponent_submission_id,
                &props.round,
                &props.attempt,
            ],
        )
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}
