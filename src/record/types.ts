/** Single recorded action (click, type, file, wait, or branch choice). */
export type RecordedStep = {
  kind: "click" | "type" | "file" | "wait" | "waitFor" | "branch";
  /** Playwright selector (e.g. CSS or text); for branch, script id. */
  selector: string;
  /** When selector matches multiple elements, which one to use (1-based, CSS-style: 1 = first, 2 = second). If 9999, edit script JSON after recording. */
  nth?: number;
  /** For type: text to fill. For file: file path (or "{{file_path}}" placeholder, replace before replay). For branch: display label. */
  value?: string;
  /** Optional step description: current page/context + action (e.g. "发布页创作者中心：点击上传图文标签"). */
  desc?: string;
};

/** A linear sequence of steps; one branch of a flow. */
export type RecordedScript = {
  /** Script id / branch name (e.g. "image-text", "long-article"). */
  id: string;
  steps: RecordedStep[];
};
