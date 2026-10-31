use crate::model::FileMetadata;
use chrono::{DateTime, SecondsFormat, Utc};
use std::{fs::Metadata, time::SystemTime};

fn timestamp(value: std::io::Result<SystemTime>) -> Option<String> {
    value
        .ok()
        .map(|time| DateTime::<Utc>::from(time).to_rfc3339_opts(SecondsFormat::Millis, true))
}

#[cfg(unix)]
fn permissions(info: &Metadata) -> Option<String> {
    use std::os::unix::fs::MetadataExt;
    let mode = info.mode();
    let mut text = String::from(if info.is_dir() { "d" } else { "-" });
    for shift in [6, 3, 0] {
        text.push(if mode & (4 << shift) != 0 { 'r' } else { '-' });
        text.push(if mode & (2 << shift) != 0 { 'w' } else { '-' });
        let executable = mode & (1 << shift) != 0;
        let special =
            mode & (if shift == 6 {
                0o4000
            } else if shift == 3 {
                0o2000
            } else {
                0o1000
            }) != 0;
        text.push(match (executable, special, shift) {
            (true, true, 0) => 't',
            (false, true, 0) => 'T',
            (true, true, _) => 's',
            (false, true, _) => 'S',
            (true, false, _) => 'x',
            _ => '-',
        });
    }
    Some(text)
}

#[cfg(not(unix))]
fn permissions(_: &Metadata) -> Option<String> {
    None
}

pub fn from_metadata(info: &Metadata) -> FileMetadata {
    FileMetadata {
        modified_at: timestamp(info.modified()),
        created_at: timestamp(info.created()),
        permissions: permissions(info),
    }
}
