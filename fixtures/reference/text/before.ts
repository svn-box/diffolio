type Theme = "light" | "dark";

export const preferences = {
  theme: "light" as Theme,
  fontSize: 13,
  showLineNumbers: true,
  ignoreWhitespace: false,
};

export function formatTitle(name: string) {
  return `Compare ${name}`;
}

// 中文与 emoji 也应保持清晰对齐 🔎
