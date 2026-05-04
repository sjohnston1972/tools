// DeepSeek streaming wrapper. Uses the OpenAI-compatible /chat/completions
// endpoint. Returns a ReadableStream of SSE-formatted bytes that the client
// reads via fetch + getReader.

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export type DeepseekStreamResult = {
  body: ReadableStream<Uint8Array>;
  // Resolves once the stream has finished, with the total token count
  // we want to bill against the daily budget. Best-effort — DeepSeek
  // returns usage in the final SSE chunk when stream_options.include_usage
  // is true.
  totalTokens: Promise<number>;
};

export async function streamDeepseek(
  apiKey: string,
  messages: ChatMsg[],
): Promise<DeepseekStreamResult> {
  const upstream = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    throw new Error(`DeepSeek upstream error ${upstream.status}: ${text.slice(0, 300)}`);
  }

  let resolveTokens: (n: number) => void;
  const totalTokens = new Promise<number>((r) => (resolveTokens = r));

  // Pipe DeepSeek's OpenAI-style SSE through to the client as our own
  // simpler `data: <text>\n\n` stream. We strip the wrapper and emit only
  // the delta content, plus a final `event: done` marker.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = "";
      let tokens = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // OpenAI-style SSE frames are separated by \n\n
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const frame = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            for (const line of frame.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                if (json.usage?.total_tokens) {
                  tokens = json.usage.total_tokens;
                }
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ t: delta })}\n\n`,
                    ),
                  );
                }
              } catch {
                // ignore malformed frames
              }
            }
          }
        }
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`,
          ),
        );
      } finally {
        controller.close();
        resolveTokens!(tokens);
      }
    },
  });

  return { body, totalTokens };
}
