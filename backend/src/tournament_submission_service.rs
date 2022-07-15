use crate::request::TournamentSubmissionKind;

use super::db_types::*;
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
            name: row.get("name"),
            kind: (row.get::<_, i64>("kind") as u8).try_into().unwrap(),
        }
    }
}

// TODO we need to figure out a way to make scheduled and unscheduled articles work better
pub async fn add(
    con: &mut impl GenericClient,
    creator_user_id: i64,
    submission_id: i64,
    tournament_id: i64,
    name: String,
    kind: TournamentSubmissionKind,
) -> Result<TournamentSubmission, tokio_postgres::Error> {
    let row = con
        .query_one(
            "INSERT INTO
             tournament_submission(
                 creator_user_id,
                 submission_id,
                 tournament_id,
                 name,
                 kind
             )
             VALUES ($1, $2, $3, $4, $5)
             RETURNING tournament_submission_id, creation_time
            ",
            &[
                &creator_user_id,
                &submission_id,
                &tournament_id,
                &name,
                &(kind.clone() as i64),
            ],
        )
        .await?;

    Ok(TournamentSubmission {
        tournament_submission_id: row.get(0),
        creation_time: row.get(1),
        creator_user_id,
        submission_id,
        tournament_id,
        name,
        kind,
    })
}

pub async fn get_recent_by_kind(
    con: &mut impl GenericClient,
    tournament_id: i64,
    kind: &[TournamentSubmissionKind],
) -> Result<Vec<TournamentSubmission>, tokio_postgres::Error> {
    let sql = [
        "SELECT ts.* FROM recent_tournament_submission ts",
        " WHERE 1 = 1",
        " AND ts.tournament_id = $1",
        " AND ts.kind = ANY($2)",
        " ORDER BY ts.tournament_submission_id",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let kinds = kind.iter().map(|x| x.clone() as i64).collect::<Vec<i64>>();

    let results = con
        .query(
            &stmnt,
            &[&tournament_id, &kinds],
        )
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}

pub async fn get_recent_by_tournament_submission(
    con: &mut impl GenericClient,
    tournament_id: i64,
    submission_id: i64,
) -> Result<Option<TournamentSubmission>, tokio_postgres::Error> {
    let sql = [
        "SELECT ts.* FROM recent_tournament_submission ts",
        " WHERE 1 = 1",
        " AND ts.tournament_id = $1",
        " AND ts.submission_id = $2",
        " ORDER BY ts.tournament_submission_id",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query_opt(&stmnt, &[&tournament_id, &submission_id])
        .await?
        .map(|row| row.into());

    Ok(results)
}

pub async fn query(
    con: &mut impl GenericClient,
    props: super::request::TournamentSubmissionViewProps,
) -> Result<Vec<TournamentSubmission>, tokio_postgres::Error> {
    let sql = [
        if props.only_recent {
            "SELECT ts.* FROM recent_tournament_submission ts"
        } else {
            "SELECT ts.* FROM tournament_submission ts"
        },
        " WHERE 1 = 1",
        " AND ($1::bigint[] IS NULL OR ts.tournament_submission_id = ANY($1))",
        " AND ($2::bigint   IS NULL OR ts.creation_time >= $2)",
        " AND ($3::bigint   IS NULL OR ts.creation_time <= $3)",
        " AND ($4::bigint[] IS NULL OR ts.creator_user_id = ANY($4))",
        " AND ($5::bigint[] IS NULL OR ts.tournament_id = ANY($5))",
        " AND ($6::bigint[] IS NULL OR ts.submission_id = ANY($6))",
        " AND ($7::bigint   IS NULL OR ts.kind = $7)",
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
                &props.tournament_id,
                &props.submission_id,
                &props.kind.map(|x| x as i64),
            ],
        )
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}
