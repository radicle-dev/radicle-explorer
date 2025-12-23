use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use std::str::FromStr;
use std::sync::Arc;

use axum::body::{Body, Bytes};
use axum::http::{Method, Request};
use axum::Router;
use serde_json::Value;
use tower::ServiceExt;

use radicle::cob::migrate;
use radicle::cob::patch::MergeTarget;
use radicle::crypto::signature::Signer;
use radicle::crypto::ssh::Keystore;
use radicle::crypto::{KeyPair, Seed, Signature};
use radicle::git::{raw as git2, RefString};
use radicle::identity::{project, Visibility};
use radicle::node::device::Device;
use radicle::node::{Features, Timestamp, UserAgent};
use radicle::profile::{env, Home};
use radicle::storage::ReadStorage;
use radicle::{node, profile};
use radicle::{Node, Storage};

use crate::api::Context;

pub const RID: &str = "rad:z4FucBZHZMCsxTyQE1dfE2YR59Qbp";
pub const RID_PRIVATE: &str = "rad:zLuTzcmoWMcdK37xqArS8eckp9vK";
pub const HEAD: &str = "e8c676b9e3b42308dc9d218b70faa5408f8e58ca";
pub const PARENT: &str = "ee8d6a29304623a78ebfa5eeed5af674d0e58f83";
pub const INITIAL_COMMIT: &str = "f604ce9fd5b7cc77b7609beda45ea8760bee78f7";
pub const DID: &str = "did:key:z6MknSLrJoTcukLrE435hVNQT4JUhbvWLX4kUzqkEStBU8Vi";
pub const ISSUE_ID: &str = "ca67d195c0b308b51810dedd93157a20764d5db5";
pub const PATCH_ID: &str = "b4084412ea3644d7dd7ae075c1cbbd4d702db0ec";
pub const TIMESTAMP: u64 = 1671125284;
pub const CONTRIBUTOR_ALIAS: &str = "seed";

/// Create a new profile.
pub fn profile(home: &Path, seed: [u8; 32]) -> radicle::Profile {
    let home = Home::new(home).unwrap();
    let keystore = Keystore::new(&home.keys());
    let keypair = KeyPair::from_seed(Seed::from(seed));
    let alias = node::Alias::new("seed");
    let storage = Storage::open(
        home.storage(),
        radicle::git::UserInfo {
            alias: alias.clone(),
            key: keypair.pk.into(),
        },
    )
    .unwrap();

    let mut db = home.policies_mut().unwrap();
    db.follow(&keypair.pk.into(), Some(&alias)).unwrap();

    let node_db = home.database_mut().unwrap();
    node_db
        .init(
            &keypair.pk.into(),
            Features::SEED,
            &alias,
            &UserAgent::default(),
            Timestamp::try_from(TIMESTAMP).unwrap(),
            [],
        )
        .unwrap();

    // Migrate COBs cache.
    let mut cobs = home.cobs_db_mut().unwrap();
    cobs.migrate(migrate::ignore).unwrap();

    radicle::storage::git::transport::local::register(storage.clone());
    keystore.store(keypair.clone(), "radicle", None).unwrap();

    radicle::Profile {
        home,
        storage,
        keystore,
        public_key: keypair.pk.into(),
        config: profile::Config::new(alias),
    }
}

pub fn seed(dir: &Path) -> Context {
    let home = dir.join("radicle");
    let profile = profile(home.as_path(), [0xff; 32]);
    let signer = Device::mock_from_seed([0xff; 32]);

    crate::logger::init().ok();

    seed_with_signer(dir, profile, &signer)
}

fn seed_with_signer<G: Signer<Signature>>(
    dir: &Path,
    profile: radicle::Profile,
    signer: &Device<G>,
) -> Context {
    const DEFAULT_BRANCH: &str = "master";

    crate::logger::init().ok();

    profile.policies_mut().unwrap();
    profile.database_mut().unwrap(); // Create the database.

    let mut policies = profile.policies_mut().unwrap();
    let workdir = dir.join("hello-world-private");
    fs::create_dir_all(&workdir).unwrap();

    // add commits to workdir (repo)
    let mut opts = git2::RepositoryInitOptions::new();
    opts.initial_head(DEFAULT_BRANCH);
    let repo = git2::Repository::init_opts(&workdir, &opts).unwrap();
    let tree = radicle::git::write_tree(
        Path::new("README"),
        "Hello Private World!\n".as_bytes(),
        &repo,
    )
    .unwrap();

    let sig_time = git2::Time::new(1673001014, 0);
    let sig = git2::Signature::new("Alice Liddell", "alice@radicle.xyz", &sig_time).unwrap();

    repo.commit(Some("HEAD"), &sig, &sig, "Initial commit\n", &tree, &[])
        .unwrap();

    // rad init
    let repo = git2::Repository::open(&workdir).unwrap();
    let name = project::ProjectName::from_str("hello-world-private").unwrap();
    let description = "Private Rad repository for tests".to_string();
    let branch = RefString::try_from(DEFAULT_BRANCH).unwrap();
    let visibility = Visibility::Private {
        allow: BTreeSet::default(),
    };
    let (rid, _, _) = radicle::rad::init(
        &repo,
        name,
        &description,
        branch,
        visibility,
        signer,
        &profile.storage,
    )
    .unwrap();

    policies
        .set_seed_policy(&rid, node::policy::Policy::Block)
        .unwrap();

    let workdir = dir.join("hello-world");

    env::set_var(env::GIT_COMMITTER_DATE, TIMESTAMP.to_string());

    fs::create_dir_all(&workdir).unwrap();

    // add commits to workdir (repo)
    let mut opts = git2::RepositoryInitOptions::new();
    opts.initial_head(DEFAULT_BRANCH);
    let repo = git2::Repository::init_opts(&workdir, &opts).unwrap();
    let tree =
        radicle::git::write_tree(Path::new("README"), "Hello World!\n".as_bytes(), &repo).unwrap();

    let sig_time = git2::Time::new(1673001014, 0);
    let sig = git2::Signature::new("Alice Liddell", "alice@radicle.xyz", &sig_time).unwrap();

    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, "Initial commit\n", &tree, &[])
        .unwrap();
    let commit = repo.find_commit(oid).unwrap();

    repo.checkout_tree(tree.as_object(), None).unwrap();

    let tree = radicle::git::write_tree(
        Path::new("CONTRIBUTING"),
        "Thank you very much!\n".as_bytes(),
        &repo,
    )
    .unwrap();
    let sig_time = git2::Time::new(1673002014, 0);
    let sig = git2::Signature::new("Alice Liddell", "alice@radicle.xyz", &sig_time).unwrap();

    let oid2 = repo
        .commit(
            Some("HEAD"),
            &sig,
            &sig,
            "Add contributing file\n",
            &tree,
            &[&commit],
        )
        .unwrap();
    let commit2 = repo.find_commit(oid2).unwrap();

    repo.checkout_tree(tree.as_object(), None).unwrap();

    fs::create_dir(workdir.join("dir1")).unwrap();
    fs::write(
        workdir.join("dir1").join("README"),
        "Hello World from dir1!\n",
    )
    .unwrap();
    let mut index = repo.index().unwrap();
    index
        .add_all(["."], git2::IndexAddOption::DEFAULT, None)
        .unwrap();
    index.write().unwrap();

    let oid = index.write_tree().unwrap();
    let tree = repo.find_tree(oid).unwrap();

    let sig_time = git2::Time::new(1673003014, 0);
    let sig = git2::Signature::new("Alice Liddell", "alice@radicle.xyz", &sig_time).unwrap();
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        "Add another folder\n",
        &tree,
        &[&commit2],
    )
    .unwrap();

    // rad init
    let repo = git2::Repository::open(&workdir).unwrap();
    let name = project::ProjectName::from_str("hello-world").unwrap();
    let description = "Rad repository for tests".to_string();
    let branch = RefString::try_from(DEFAULT_BRANCH).unwrap();
    let visibility = Visibility::default();
    let (rid, _, _) = radicle::rad::init(
        &repo,
        name,
        &description,
        branch,
        visibility,
        signer,
        &profile.storage,
    )
    .unwrap();
    policies.seed(&rid, node::policy::Scope::All).unwrap();
    let node_handle = &mut Node::new(profile.socket());
    profile
        .seed(rid, node::policy::Scope::All, node_handle)
        .unwrap();
    profile.add_inventory(rid, node_handle).unwrap();

    let storage = &profile.storage;
    let repo = storage.repository(rid).unwrap();
    let mut issues = profile.issues_mut(&repo).unwrap();
    let issue = issues
        .create(
            "Issue #1".to_string(),
            "Change 'hello world' to 'hello everyone'".to_string(),
            &[],
            &[],
            [],
            signer,
        )
        .unwrap();
    tracing::debug!(target: "test", "Contributor issue: {}", issue.id());

    // eq. rad patch open
    let mut patches = profile.patches_mut(&repo).unwrap();
    let oid = radicle::git::Oid::from_str(HEAD).unwrap();
    let base = radicle::git::Oid::from_str(PARENT).unwrap();
    let patch = patches
        .create(
            "A new `hello world`",
            "change `hello world` in README to something else",
            MergeTarget::Delegates,
            base,
            oid,
            &[],
            signer,
        )
        .unwrap();
    tracing::debug!(target: "test", "Contributor patch: {}", patch.id());

    let workdir = dir.join("again-hello-world");

    env::set_var(env::GIT_COMMITTER_DATE, TIMESTAMP.to_string());

    fs::create_dir_all(&workdir).unwrap();

    // add commits to workdir (repo)
    let mut opts = git2::RepositoryInitOptions::new();
    opts.initial_head(DEFAULT_BRANCH);
    let repo = git2::Repository::init_opts(&workdir, &opts).unwrap();
    let tree = radicle::git::write_tree(
        Path::new("README"),
        "Hello World Again!\n".as_bytes(),
        &repo,
    )
    .unwrap();

    let sig_time = git2::Time::new(1673001014, 0);
    let sig = git2::Signature::new("Alice Liddell", "alice@radicle.xyz", &sig_time).unwrap();

    repo.commit(Some("HEAD"), &sig, &sig, "Initial commit\n", &tree, &[])
        .unwrap();

    repo.checkout_tree(tree.as_object(), None).unwrap();

    // rad init
    let repo = git2::Repository::open(&workdir).unwrap();
    let name = project::ProjectName::from_str("again-hello-world").unwrap();
    let description = "Rad repository for sorting".to_string();
    let branch = RefString::try_from(DEFAULT_BRANCH).unwrap();
    let visibility = Visibility::default();
    let (rid, _, _) = radicle::rad::init(
        &repo,
        name,
        &description,
        branch,
        visibility,
        signer,
        &profile.storage,
    )
    .unwrap();
    policies.seed(&rid, node::policy::Scope::Followed).unwrap();
    profile
        .seed(rid, node::policy::Scope::Followed, node_handle)
        .unwrap();
    profile.add_inventory(rid, node_handle).unwrap();

    let options = crate::Options {
        aliases: std::collections::HashMap::new(),
        listen: axum_listener::DualAddr::Tcp(std::net::SocketAddr::from(([0, 0, 0, 0], 8080))),
        cache: Some(crate::DEFAULT_CACHE_SIZE),
    };

    Context::new(Arc::new(profile), &options)
}

pub async fn get(app: &Router, path: impl ToString) -> Response {
    Response(
        app.clone()
            .oneshot(request(path, Method::GET, None))
            .await
            .unwrap(),
    )
}

fn request(path: impl ToString, method: Method, body: Option<Body>) -> Request<Body> {
    let request = Request::builder()
        .method(method)
        .uri(path.to_string())
        .header("Content-Type", "application/json");

    request.body(body.unwrap_or_else(Body::empty)).unwrap()
}

#[derive(Debug)]
pub struct Response(axum::response::Response);

impl Response {
    pub async fn json(self) -> Value {
        let body = self.body().await;
        serde_json::from_slice(&body).unwrap()
    }

    pub fn status(&self) -> axum::http::StatusCode {
        self.0.status()
    }

    pub async fn body(self) -> Bytes {
        axum::body::to_bytes(self.0.into_body(), usize::MAX)
            .await
            .unwrap()
    }
}
