import { z } from "zod";
import type { ModelProviderConfig } from "../config.js";
import type { ElementDescriptor } from "../record/selectorFromElement.js";
import { LlmClient } from "./LlmClient.js";
import { logger } from "../logger.js";

const MAX_HTML_CHARS = 120_000;

const RecordStepSchema = z.object({
  /** Playwright selector; if multiple identical elements exist, include nth (e.g. >> nth=1). */
  selector: z.string(),
  /** Specific step description: current page/context + action (e.g. "发布页创作者中心：点击上传图文标签"). */
  desc: z.string(),
});

export type RecordStepLlmResult = z.infer<typeof RecordStepSchema>;

/**
 * At record time: given page HTML and the clicked element descriptor, ask LLM (structured output)
 * for a unique Playwright selector and a description of the action.
 */
export async function recordStepFromElement(
  html: string,
  descriptor: ElementDescriptor,
  options: { kind: "click" | "type" | "file"; value?: string },
  modelProvider: ModelProviderConfig
): Promise<RecordStepLlmResult | null> {
  if (!modelProvider.apiKey) {
    logger.warn("recordStepFromElement: no apiKey, skip LLM");
    return null;
  }

  const htmlForLlm =
    html.length > MAX_HTML_CHARS ? html.slice(-MAX_HTML_CHARS) : html;
  const descriptorJson = JSON.stringify(descriptor, null, 0);

  // 仅用于录制：LLM 根据点击元素生成 selector 和 desc；重放时不调用 LLM，直接用录制时保存的 selector。
  const systemPrompt = `你是 Playwright 选择器专家。根据页面 HTML 和用户点击的元素描述，输出一个包含两个字段的 JSON 对象：
- "selector"：能唯一定位该元素的 Playwright 选择器。必须遵守以下规则：
  - 选择器要简单、稳定——避免过于具体的路径，以免页面 HTML 小调整导致重放失败。
  - data-pf 是临时标记，标记了用户点击的元素，可辅助判断目标；禁止在输出的 selector 中使用 data-pf，该属性仅在当前快照中存在，执行 selector 时已不存在。
  - 禁止：不要使用无意义的深层路径（如 div > div > div 或 div > div:nth-child(3) > span），结构小改就会失效。
  - 鼓励：用父路径上有语义的节点收窄范围，例如 .header、.upload-wrap、[class*="upload"]、section:has-text("标题")，而不是一串 div。针对「名-hash」型 class 的页面，用 [class*="稳定前缀"] 配合 :has-text("按钮或标题文案")，例如可点击卡片： [class*="icon-video"]:has([class*="title-"]:has-text("发布视频"))。
  - 禁止：不要使用临时状态类名（.active、.selected、.open、.focus），这些会随用户操作改变。
  - 禁止：不要使用带编译 hash 的 class 名（如 .container-I46hmx、.title-XV1iWc、.btn-OkpBsP）。横线后的后缀是构建时生成的，每次发布可能变化，重放会失败。若要用 class，只使用稳定前缀，写成 [class*="前缀"]（例如 [class*="icon-video"]、[class*="title-"]），并优先配合 :has-text("可见文案") 定位。
  - 禁止：不要使用 :visible，Playwright 不支持。
  - 禁止：除非别无他法，否则不要使用 nth-child/nth-of-type，优先用语义化属性或父级语义节点。
  - 优先（最稳定）：[id="..."]、[data-testid="..."]、[data-e2e="..."]、[aria-label="..."]、role=button[name="..."]、[placeholder="..."]。
  - 优先：用 has-text("稳定文案") 或 :has-text() 定位唯一可见文案。
  - 若存在多个相似元素，用父级有语义的上下文（如 .upload-wrap:has(button)、section:has-text("标题"):has(button)）而非纯 div 长链或 nth=N。
- "desc"：一句话描述该步骤：(1) 当前页面/场景（如 发布页创作者中心、笔记编辑页），正在执行的动作（如 点击上传图文标签、在标题输入框输入）`;

  const userContent = `步骤类型：${options.kind}${options.value != null ? `，输入值长度：${String(options.value).length}` : ""}。

被点击元素的描述：
${descriptorJson}

页面 HTML${html.length > MAX_HTML_CHARS ? `（已截取末尾 ${MAX_HTML_CHARS} 字符）` : ""}：
\`\`\`html
${htmlForLlm}
\`\`\``;

  logger.info("正在调用LLM, 请等待...")
  try {
    const client = new LlmClient({
      apiKey: modelProvider.apiKey,
      baseURL: modelProvider.baseUrl,
      model: modelProvider.model,
    });
    const result = await client.chatStructured(
      { system: systemPrompt, user: userContent },
      RecordStepSchema,
      "record_step"
    );
    if (result.selector?.trim() && result.desc?.trim()) {
      return {
        selector: result.selector.trim(),
        desc: result.desc.trim(),
      };
    }
    return null;
  } catch (err) {
    logger.warn("recordStepFromElement LLM error:", err instanceof Error ? err.message : err);
    return null;
  }
}
