use super::db_types::*;
use super::request;
use tokio_postgres::GenericClient;

impl From<tokio_postgres::row::Row> for TestcaseData {
    // select * from testcase_data order only, otherwise it will fail
    fn from(row: tokio_postgres::Row) -> TestcaseData {
        TestcaseData {
            testcase_data_id: row.get("testcase_data_id"),
            creation_time: row.get("creation_time"),
            creator_user_id: row.get("creator_user_id"),
            submission_id: row.get("submission_id"),
            active: row.get("active"),
        }
    }
}

pub async fn add(
    con: &mut impl GenericClient,
    creator_user_id: i64,
    submission_id: i64,
    active: bool,
) -> Result<TestcaseData, tokio_postgres::Error> {
    let row = con
        .query_one(
            "INSERT INTO
       testcase_data(
           creator_user_id,
           submission_id,
           active
       )
       VALUES ($1, $2, $3)
       RETURNING testcase_data_id, creation_time
      ",
            &[&creator_user_id, &submission_id, &active],
        )
        .await?;

    // return testcase_data
    Ok(TestcaseData {
        testcase_data_id: row.get(0),
        creation_time: row.get(1),
        creator_user_id,
        submission_id,
        active,
    })
}

pub async fn get_recent(
    con: &mut impl GenericClient,
) -> Result<Vec<TestcaseData>, tokio_postgres::Error> {
    let sql = [
        " SELECT td.* FROM recent_testcase_data td",
        " WHERE 1 = 1",
        " AND td.active",
        " ORDER BY td.testcase_data_id",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query(&stmnt, &[])
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}

pub async fn query(
    con: &mut impl GenericClient,
    props: request::TestcaseDataViewProps,
) -> Result<Vec<TestcaseData>, tokio_postgres::Error> {
    let sql = [
        if props.only_recent {
            "SELECT td.* FROM recent_testcase_data td"
        } else {
            "SELECT td.* FROM testcase_data td"
        },
        " WHERE 1 = 1",
        " AND ($1::bigint[]  IS NULL OR td.testcase_data_id = ANY($1))",
        " AND ($2::bigint    IS NULL OR td.creation_time >= $2)",
        " AND ($3::bigint    IS NULL OR td.creation_time <= $3)",
        " AND ($4::bigint[]  IS NULL OR td.creator_user_id = ANY($4))",
        " AND ($5::bigint[]  IS NULL OR td.submission_id = ANY($5))",
        " AND ($6::bool      IS NULL OR td.active = $6)",
        " ORDER BY td.testcase_data_id",
    ]
    .join("\n");

    let stmnt = con.prepare(&sql).await?;

    let results = con
        .query(
            &stmnt,
            &[
                &props.testcase_data_id,
                &props.min_creation_time,
                &props.max_creation_time,
                &props.creator_user_id,
                &props.submission_id,
                &props.active,
            ],
        )
        .await?
        .into_iter()
        .map(|row| row.into())
        .collect();

    Ok(results)
}
