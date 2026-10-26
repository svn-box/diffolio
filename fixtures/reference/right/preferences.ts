type Theme = "light" | "dark" | "system";

export const preferences = {
  theme: "system" as Theme,
  fontSize: 14,
  showLineNumbers: true,
  ignoreWhitespace: false,
  collapseUnchanged: true,
};

export function formatTitle(name: string) {
  return `Review ${name.trim()}`;
}

// 中文与 emoji 也应保持清晰对齐 🔎
