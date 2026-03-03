import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export type LlmClientOptions = {
  apiKey: string;
  baseURL: string;
  model: string;
};

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type InputItem = { type: "message"; role: "system" | "user" | "assistant"; content: string };

/** LLM client: streaming chat + structured output (Responses API + zod). */
export class LlmClient {
  private client: OpenAI;
  private options: Required<LlmClientOptions>;

  constructor(options: LlmClientOptions) {
    this.options = {
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      model: options.model,
    };
    this.client = new OpenAI({
      apiKey: this.options.apiKey,
      baseURL: this.options.baseURL,
    });
  }

  private buildInputList(messages: ChatMessage[]): InputItem[] {
    return messages.map((m) => ({ type: "message" as const, role: m.role, content: m.content }));
  }

  /** Build input for Responses API (system + user). */
  private buildInput(user: string, system?: string): InputItem[] {
    const items: InputItem[] = [];
    if (system) items.push({ type: "message", role: "system", content: system });
    items.push({ type: "message", role: "user", content: user });
    return items;
  }

  /**
   * Multi-turn chat with streaming; returns full assistant content.
   */
  async chatStream(messages: ChatMessage[]): Promise<string> {
    const input = this.buildInputList(messages);
    const stream = await this.client.responses.create({
      model: this.options.model,
      input,
      stream: true,
    });
    let content = "";
    for await (const event of stream) {
      if (
        event.type === "response.output_text.delta" &&
        "delta" in event &&
        typeof (event as { delta: string }).delta === "string"
      ) {
        content += (event as { delta: string }).delta;
      }
    }
    return content;
  }

  /** Non-streaming multi-turn chat. */
  async chat(messages: ChatMessage[]): Promise<string> {
    return this.chatStream(messages);
  }

  /**
   * Chat with structured output (Responses API + text.format json_schema).
   * Uses zodTextFormat so callers pass a Zod schema; returns parsed z.infer<Z>.
   */
  async chatStructured<Z extends z.ZodType>(
    params: { system?: string; user: string },
    zodObject: Z,
    name: string
  ): Promise<z.infer<Z>> {
    const format = zodTextFormat(zodObject, name);
    const res = await this.client.responses.create({
      model: this.options.model,
      input: this.buildInput(params.user, params.system),
      text: { format },
    });
    const raw = res.output_text ?? "{}";
    return zodObject.parse(JSON.parse(raw)) as z.infer<Z>;
  }
}
