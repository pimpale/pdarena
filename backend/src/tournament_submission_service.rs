use super::db_types::*;
use super::utils::current_time_millis;
use std::convert::From;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for TournamentSubmission {
    // select * from tournament_submission order only, otherwise it will fail
    fn from(row: tokio_postgres::Row) -> TournamentSubmission {
        TournamentSubmission {
            tournament_submission_id: row.get("tournament_submission_id"),
            creation_time: row.get("creation_time"),
            creator_user_id: row.get("creator_user_id"),
            submission_id: row.get("submission_id"),
            tournament_id: row.get("tournament_id"),
        }
    }
}

// TODO we need to figure out a way to make scheduled and unscheduled articles work better
pub async fn add(
    con: &mut impl GenericClient,
    creator_user_id: i64,
    submission_id: i64,
    tournament_id: i64,
) -> Result<TournamentSubmission, tokio_postgres::Error> {
    let creation_time = current_time_millis();

    let row = con
        .query_one(
            "INSERT INTO
             tournament_submission(
                 creator_user_id,
                 submission_id,
                 tournament_id,
             )
             VALUES ($1, $2, $3)
             RETURNING tournament_submission_id, creation_time
            ",
            &[&submission_id, &tournament_id, &creator_user_id],
        )
        .await?;

    Ok(TournamentSubmission {
        tournament_submission_id: row.get(0),
        creation_time: row.get(1),
        creator_user_id,
        submission_id,
        tournament_id,
    })
}

pub async fn query(
    con: &mut impl GenericClient,
    props: super::request::TournamentSubmissionViewProps,
) -> Result<Vec<TournamentSubmission>, tokio_postgres::Error> {
    let sql = [
        "SELECT m.* FROM tournament_submission ts",
        " WHERE 1 = 1",
        " AND ($1::bigint[] IS NULL OR ts.tournament_submission_id = ANY($1))",
        " AND ($2::bigint   IS NULL OR ts.creation_time >= $2)",
        " AND ($3::bigint   IS NULL OR ts.creation_time <= $3)",
        " AND ($4::bigint[] IS NULL OR ts.creator_user_id = ANY($4))",
        " AND ($5::bigint[] IS NULL OR ts.submission_id = ANY($5))",
        " AND ($6::bigint[] IS NULL OR ts.tournament_id = ANY($6))",
        " ORDER BY ts.tournament_submission_id",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query(
            &stmnt,
            &[
                &props.tournament_submission_id,
                &props.min_creation_time,
                &props.max_creation_time,
                &props.creator_user_id,
                &props.submission_id,
                &props.tournament_id,
            ],
        )
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}
