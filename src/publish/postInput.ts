import * as fs from "node:fs/promises";
import * as path from "node:path";

/** Shape of ~/.post-flow/post.json (or similar). */
export interface PostInput {
  platform: string;
  script_id?: string;
  title: string;
  content: string;
  content_path?: string;
  image_paths?: string[];
  video_path?: string;
}

/** Resolved post: content from content_path file if set, else content field. */
export interface ResolvedPost {
  platform: string;
  scriptId?: string;
  title: string;
  content: string;
  imagePaths: string[];
  videoPath: string;
}

export async function loadPostFromFile(postPath: string): Promise<ResolvedPost> {
  const raw = await fs.readFile(path.resolve(postPath), "utf8");
  const data = JSON.parse(raw) as PostInput;
  if (!data.platform || typeof data.platform !== "string") {
    throw new Error("post.json must have platform");
  }
  let content = typeof data.content === "string" ? data.content : "";
  if (data.content_path && typeof data.content_path === "string" && data.content_path.trim()) {
    const fullPath = path.isAbsolute(data.content_path) ? data.content_path : path.join(path.dirname(path.resolve(postPath)), data.content_path);
    content = await fs.readFile(fullPath, "utf8");
  }
  const imagePaths = Array.isArray(data.image_paths) ? data.image_paths.map((p) => (path.isAbsolute(p) ? p : path.join(path.dirname(path.resolve(postPath)), p))) : [];
  const videoPath = typeof data.video_path === "string" ? data.video_path : "";
  const scriptId =
    typeof data.script_id === "string" && data.script_id.trim() ? data.script_id.trim() : undefined;
  return {
    platform: data.platform,
    scriptId,
    title: typeof data.title === "string" ? data.title : "",
    content,
    imagePaths,
    videoPath,
  };
}

/** Resolve step value: {{title}}, {{content}}, {{image_paths}} from post. */
export function resolveStepValue(value: string | undefined, post: ResolvedPost): string {
  if (value == null || value === "") return "";
  const imagePathsStr = post.imagePaths.join(",");
  return value
    .replace(/\{\{title\}\}/g, post.title)
    .replace(/\{\{content\}\}/g, post.content)
    .replace(/\{\{image_paths\}\}/g, imagePathsStr);
}
