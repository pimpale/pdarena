use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::response;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionRequest {
    language_id: i64,
    source_code: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionRequestResponse {
    token: String,
}

#[derive(Clone)]
pub struct Judge0Service {
    client: Client,
    service_url: String,
}

impl Judge0Service {
    pub async fn new(service_url: &str) -> Self {
        Judge0Service {
            service_url: String::from(service_url),
            client: Client::new(),
        }
    }

    // If the ApiKey is valid, returns the user it refers to.
    // If the ApiKey is invalid or the user doesn't exist, returns an error
    pub async fn send_submission(
        &self,
        request: SubmissionRequest,
    ) -> Result<SubmissionRequestResponse, response::AppError> {
        self.client
            .post(format!(
                "{}/submissions/?wait=false&base64_encoded=false",
                self.service_url
            ))
            .json(&request)
            .send()
            .await
            .map_err(|_| response::AppError::Network)?
            .json()
            .await
            .map_err(|_| response::AppError::DecodeError)?
    }
}
