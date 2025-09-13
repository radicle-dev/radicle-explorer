use std::{
    convert::Infallible,
    fs::File,
    io::BufReader,
    net::{IpAddr, SocketAddr},
    path::Path,
};

use axum::extract::{ConnectInfo, FromRequestParts};
use hyper::HeaderMap;
use ipnet::IpNet;
use radicle::prelude::{Did, Doc, RepoId};
use serde::Deserialize;

use crate::RealIpHeaderName;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum AccessPolicy {
    /// Always allow access.
    Allow,
    /// Always deny access.
    Deny,

    /// Allow if all contained policies allow.
    #[serde(alias = "AllOf")]
    And(Vec<AccessPolicy>),

    /// Allow if any contained policy allows.
    #[serde(alias = "AnyOf")]
    Or(Vec<AccessPolicy>),

    /// Allow if no contained policy allows.
    #[serde(alias = "NoneOf")]
    Not(Vec<AccessPolicy>),

    /// Allow this specific repository.
    Repository(RepoId),

    /// Allow repositories with this specific visibility.
    Visibility(Visibility),

    /// Allow repsoitories visible to this specific DID.
    AllowedDid(Did),

    /// Allow access from this IP network.
    Ip(IpNet),

    /// Allow access if this specific request header is present.
    Header(ExpectedHeader),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum Visibility {
    Public,
    Private,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ExpectedHeader {
    /// Name of the expected header.
    pub name: String,
    /// Value of the expected header. Matches anything if unset.
    pub value: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub struct AuthRequest<'a> {
    rid: RepoId,
    doc: &'a Doc,
    http: &'a HttpClientInfo,
}

#[derive(Debug, Clone, Default)]
pub struct HttpClientInfo {
    ip: Option<IpAddr>,
    headers: HeaderMap,
}

impl Default for AccessPolicy {
    fn default() -> Self {
        Self::Visibility(Visibility::Public)
    }
}

impl AccessPolicy {
    pub fn try_from_path(path: &Path) -> Result<Self, Error> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        Ok(serde_json::from_reader(reader)?)
    }

    pub fn check(&self, req: AuthRequest<'_>) -> bool {
        match self {
            AccessPolicy::Allow => true,
            AccessPolicy::Deny => false,
            AccessPolicy::And(items) => items.iter().all(|i| i.check(req)),
            AccessPolicy::Or(items) => items.iter().any(|i| i.check(req)),
            AccessPolicy::Not(items) => !items.iter().any(|i| i.check(req)),
            AccessPolicy::Repository(repo_id) => req.rid == *repo_id,
            AccessPolicy::Visibility(Visibility::Public) => req.doc.is_public(),
            AccessPolicy::Visibility(Visibility::Private) => req.doc.is_private(),
            AccessPolicy::AllowedDid(did) => req.doc.is_visible_to(did),
            AccessPolicy::Ip(ip_net) => req.http.ip.is_some_and(|ip| ip_net.contains(&ip)),
            AccessPolicy::Header(ExpectedHeader {
                name,
                value: Some(value),
            }) => req
                .http
                .headers
                .get_all(name)
                .iter()
                .any(|v| v.as_bytes() == value.as_bytes()),
            AccessPolicy::Header(ExpectedHeader { name, value: None }) => {
                req.http.headers.contains_key(name)
            }
        }
    }
}

impl<S: Send + Sync> FromRequestParts<S> for HttpClientInfo {
    type Rejection = Infallible;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let headers = parts.headers.clone();

        let ip = match parts.extensions.get::<RealIpHeaderName>() {
            Some(RealIpHeaderName(Some(real_ip_header_name))) => headers
                .get(&**real_ip_header_name)
                .and_then(|value| value.to_str().ok()?.parse().ok()),
            _ => ConnectInfo::<SocketAddr>::from_request_parts(parts, state)
                .await
                .ok()
                .map(|ci| ci.0.ip()),
        };

        Ok(Self { ip, headers })
    }
}

impl HttpClientInfo {
    pub fn with_repo<'a>(&'a self, rid: RepoId, doc: &'a Doc) -> AuthRequest<'a> {
        AuthRequest {
            rid,
            doc,
            http: self,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// Repository error.
    #[error(transparent)]
    Repository(#[from] radicle::storage::RepositoryError),

    /// I/O error.
    #[error(transparent)]
    Io(#[from] std::io::Error),

    /// JSON error.
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use tempfile::NamedTempFile;

    use super::*;

    #[test]
    fn load_access_policy() {
        let policy_json = r#"
            {
              "Or": [
                { "Visibility": "Public" },
                {
                  "And": [
                    { "Repository": "rad:zh9TbkD5Ldp6qNPkVtSb39mi4bEX" },
                    { "Header": { "name": "X-Repo-Access-test-repo" } }
                  ]
                },
                { "Ip": "127.0.0.0/8" },
                { "Ip": "::1/128" }
              ]
            }
        "#;

        let expected = AccessPolicy::Or(vec![
            AccessPolicy::Visibility(Visibility::Public),
            AccessPolicy::And(vec![
                AccessPolicy::Repository("rad:zh9TbkD5Ldp6qNPkVtSb39mi4bEX".parse().unwrap()),
                AccessPolicy::Header(ExpectedHeader {
                    name: "X-Repo-Access-test-repo".into(),
                    value: None,
                }),
            ]),
            AccessPolicy::Ip("127.0.0.0/8".parse().unwrap()),
            AccessPolicy::Ip("::1/128".parse().unwrap()),
        ]);

        let tmp = NamedTempFile::new().unwrap();
        write!(&tmp, "{policy_json}").unwrap();

        let policy = AccessPolicy::try_from_path(tmp.path()).unwrap();
        assert_eq!(policy, expected);
    }
}
