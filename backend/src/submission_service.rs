use super::db_types::*;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for Submission {
    // select * from submission order only, otherwise it will fail
    fn from(row: tokio_postgres::Row) -> Submission {
        Submission {
            submission_id: row.get("submission_id"),
            creation_time: row.get("creation_time"),
            creator_user_id: row.get("creator_user_id"),
            code: row.get("code"),
        }
    }
}

pub async fn add(
    con: &mut impl GenericClient,
    creator_user_id: i64,
    code: String,
) -> Result<Submission, tokio_postgres::Error> {
    let row = con
        .query_one(
            "INSERT INTO
             submission(
                 creator_user_id,
                 code
             )
             VALUES($1, $2)
             RETURNING submission_id, creation_time
            ",
            &[&creator_user_id, &code],
        )
        .await?;

    // return submission
    Ok(Submission {
        submission_id: row.get(0),
        creation_time: row.get(1),
        creator_user_id,
        code,
    })
}

pub async fn get_by_submission_id(
    con: &mut impl GenericClient,
    submission_id: i64,
) -> Result<Option<Submission>, tokio_postgres::Error> {
    let result = con
        .query_opt(
            "SELECT * FROM submission WHERE submission_id=$1",
            &[&submission_id],
        )
        .await?
        .map(|x| x.into());
    Ok(result)
}

pub async fn query(
    con: &mut impl GenericClient,
    props: super::request::SubmissionViewProps,
) -> Result<Vec<Submission>, tokio_postgres::Error> {
    let sql = [
        "SELECT s.* FROM submission s",
        " WHERE 1 = 1",
        " AND ($1::bigint   IS NULL OR s.creation_time >= $1)",
        " AND ($2::bigint   IS NULL OR s.creation_time <= $2)",
        " AND ($3::bigint[] IS NULL OR s.submission_id = ANY($3))",
        " AND ($4::bigint[] IS NULL OR s.creator_user_id = ANY($4))",
        " ORDER BY s.submission_id",
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
                &props.creator_user_id,
            ],
        )
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}
