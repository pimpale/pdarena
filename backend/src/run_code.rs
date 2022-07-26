use std::collections::HashMap;

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::handlers::report_base64_err;

use super::response;

use super::handlers::report_io_err;

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
    pub exit_code: Option<i64>,
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
        let response = self
            .client
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
            header.set_mode(0o777);
            header.set_size(file_content.as_bytes().len() as u64);
            archive
                .append_data(&mut header, file_name, file_content.as_bytes())
                .map_err(report_io_err)?;
        }

        let tar_buf = archive.into_inner().map_err(report_io_err)?;

        let x = self
            .send_submission(RunCodeRequest {
                max_time_s: super::MAX_TIME,
                base_64_tar_gz: base64::encode(&tar_buf),
            })
            .await
            .unwrap();

        let summary = SubmissionSummary {
            stdout: String::from_utf8_lossy(&base64::decode(x.stdout).map_err(report_base64_err)?)
                .to_string(),
            stderr: String::from_utf8_lossy(&base64::decode(x.stderr).map_err(report_base64_err)?)
                .to_string(),
            exit_code: x.exit_code,
        };

        Ok(summary)
    }
}
