use std::collections::HashMap;
use std::io::Write;

use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::response;

use super::handlers::report_io_err;
use super::handlers::report_zip_err;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunCodeRequest {
    pub base_64_tar_gz: String,
    pub max_time_s: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunCodeResponse {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SubmissionSummary {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i64,
}

#[derive(Clone)]
pub struct RunCodeService {
    client: Client,
    service_url: String,
}

impl RunCodeService {
    pub async fn new(service_url: &str) -> Self {
        RunCodeService {
            service_url: String::from(service_url),
            client: Client::new(),
        }
    }

    // If the ApiKey is valid, returns the user it refers to.
    // If the ApiKey is invalid or the user doesn't exist, returns an error
    pub async fn send_submission(
        &self,
        request: RunCodeRequest,
    ) -> Result<RunCodeResponse, response::AppError> {
        let response = self.client
            .post(format!("{}/run_code", self.service_url))
            .json(&request)
            .send()
            .await
            .map_err(|_| response::AppError::Network)?
            .json()
            .await
            .map_err(|_| response::AppError::DecodeError)?;

        Ok(response)
    }

    pub async fn send_multifile_submission(
        &self,
        map: HashMap<String, String>,
    ) -> Result<SubmissionSummary, response::AppError> {

        let mut archive = tar::Builder::new(vec![]);

        for (file_name, file_content) in map {
          let mut header = tar::Header::new_gnu();
          header.set_size(file_content.as_bytes().len() as u64);
          archive.append_data(&mut header, file_name, file_content.as_bytes()).map_err(report_io_err)?;
        }

        let tar_buf = archive.into_inner().map_err(report_zip_err)?;

        let response = self.send_submission(RunCodeRequest {
            max_time_s: 1.0,
            base_64_tar_gz: base64::encode(&tar_buf),
        })
        .await;

        dbg!(response);
        panic!();
    }
}
