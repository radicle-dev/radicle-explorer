use std::path::Path;
use std::str;

use base64::{prelude::BASE64_STANDARD, Engine};
use radicle_surf as surf;
use serde_json::{json, Value};

pub(crate) struct Commit<'a>(&'a surf::Commit);

impl<'a> Commit<'a> {
    pub fn new(commit: &'a surf::Commit) -> Self {
        Self(commit)
    }

    pub fn as_json(&self) -> Value {
        json!({
            "id": self.0.id,
            "author": {
                "name": self.0.author.name,
                "email": self.0.author.email
            },
            "summary": self.0.summary,
            "description": self.0.description(),
            "parents": self.0.parents,
            "committer": {
                "name": self.0.committer.name,
                "email": self.0.committer.email,
                "time": self.0.committer.time.seconds()
            }
        })
    }
}

pub(crate) struct Blob<'a, T: AsRef<[u8]>>(&'a surf::blob::Blob<T>);

impl<'a, T: AsRef<[u8]>> Blob<'a, T> {
    pub fn new(blob: &'a surf::blob::Blob<T>) -> Self {
        Self(blob)
    }

    pub fn as_json(&self, path: &str) -> Value {
        let content = match str::from_utf8(self.0.content()) {
            Ok(s) => s.to_owned(),
            Err(_) => BASE64_STANDARD.encode(self.0.content()),
        };

        json!({
            "binary": self.0.is_binary(),
            "name": name_in_path(path),
            "content": content,
            "path": path,
            "lastCommit": Commit(self.0.commit()).as_json()
        })
    }
}

pub(crate) struct Tree<'a>(&'a surf::tree::Tree);

impl<'a> Tree<'a> {
    pub fn new(tree: &'a surf::tree::Tree) -> Self {
        Self(tree)
    }

    pub fn as_json(&self, path: &str) -> Value {
        let prefix = Path::new(path);
        let entries = self
            .0
            .entries()
            .iter()
            .map(|entry| {
                json!({
                    "path": prefix.join(entry.name()),
                    "oid": entry.object_id(),
                    "name": entry.name(),
                    "kind": match entry.entry() {
                        surf::tree::EntryKind::Tree(_) => "tree",
                        surf::tree::EntryKind::Blob(_) => "blob",
                        surf::tree::EntryKind::Submodule { .. } => "submodule"
                    },
                })
            })
            .collect::<Vec<_>>();

        json!({
            "entries": &entries,
            "lastCommit": Commit::new(self.0.commit()).as_json(),
            "name": name_in_path(path),
            "path": path,
        })
    }
}

/// Returns the name part of a path string.
fn name_in_path(path: &str) -> &str {
    match path.rsplit('/').next() {
        Some(name) => name,
        None => path,
    }
}
