use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    pub appearance: String,
    pub font_size: u8,
    pub wrap: bool,
    pub collapse: bool,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            appearance: "system".into(),
            font_size: 12,
            wrap: false,
            collapse: false,
        }
    }
}

impl Preferences {
    pub fn validate(&self) -> Result<(), String> {
        if !["system", "light", "dark"].contains(&self.appearance.as_str())
            || !(11..=20).contains(&self.font_size)
        {
            return Err("偏好设置无效。".into());
        }
        Ok(())
    }
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PreferencePatch {
    pub appearance: Option<String>,
    pub font_size: Option<u8>,
    pub wrap: Option<bool>,
    pub collapse: Option<bool>,
}

impl PreferencePatch {
    pub fn apply(self, current: &Preferences) -> Result<Preferences, String> {
        let next = Preferences {
            appearance: self
                .appearance
                .unwrap_or_else(|| current.appearance.clone()),
            font_size: self.font_size.unwrap_or(current.font_size),
            wrap: self.wrap.unwrap_or(current.wrap),
            collapse: self.collapse.unwrap_or(current.collapse),
        };
        next.validate()?;
        Ok(next)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceFile {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    pub kind: String,
    pub content: String,
    pub bytes: usize,
    pub bom: bool,
    pub line_ending: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

impl SourceFile {
    pub fn snapshot(&self) -> Self {
        Self {
            id: self.id.clone(),
            name: self.name.clone(),
            path: self.path.clone(),
            kind: self.kind.clone(),
            content: String::new(),
            bytes: self.bytes,
            bom: self.bom,
            line_ending: self.line_ending.clone(),
            hash: self.hash.clone(),
            image_url: None,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderEntry {
    pub path: String,
    pub kind: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub left: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub right: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub left_size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub right_size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct FolderComparison {
    pub id: String,
    pub left: String,
    pub right: String,
    pub entries: Vec<FolderEntry>,
}

#[derive(Clone, Debug, Serialize)]
pub struct OpenResult {
    pub files: Vec<SourceFile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub folder: Option<FolderComparison>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentComparison {
    pub id: String,
    pub paths: Vec<String>,
    pub name: String,
    pub kind: String,
    pub opened_at: String,
}

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(default)]
pub struct Store {
    pub preferences: Preferences,
    pub recents: Vec<RecentComparison>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub task_id: String,
    pub count: usize,
}

pub fn path_string(path: &std::path::Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_owned)
        .ok_or_else(|| "文件路径包含无法显示的字符。".into())
}

pub fn io_error(error: std::io::Error) -> String {
    format!("无法访问文件：{error}")
}
