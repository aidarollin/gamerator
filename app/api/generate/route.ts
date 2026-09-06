import { Brief } from "@/lib/spec/brief";
import { generateSpec, type Stage } from "@/lib/generate";
import { record } from "@/lib/generate/audit";

export const runtime = "nodejs";

/**
 * POST /api/generate - Server-Sent Events.
 *
 * TWO ERROR PATHS, AND THEY ARE NOT INTERCHANGEABLE.
 *
 * Before the stream opens, a failure is an HTTP status: the client sees a 400
 * or a 500 and can treat it as a failed request. After the first byte the
 * status is locked at 200, so every later failure must be emitted as an
 * `error` EVENT inside the stream. Getting this wrong ships a 200 that the
 * client reads as success while the body says otherwise.
 *
 * Events: `stage`, then exactly one terminal event -
 * `spec` | `invalid` | `refused` | `error`.
 */

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  // ---- before the stream: real HTTP statuses ----
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const brief = Brief.safeParse(body);
  if (!brief.success) {
    return Response.json(
      {
        error: "invalid_brief",
        issues: brief.error.issues.map((i) => ({
          path: i.path.map(String).join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  // ---- from here the status is 200 and failures are events ----
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      try {
        const outcome = await generateSpec(brief.data, {
          onStage: (stage: Stage) => send("stage", { stage }),
        });

        record(outcome.audit);

        switch (outcome.status) {
          case "ok":
          case "repaired":
            send("spec", {
              spec: outcome.spec,
              repaired: outcome.status === "repaired",
            });
            break;
          case "invalid":
            // Honest failure. A game that quietly lost three questions is
            // worse than one that says it could not be made.
            send("invalid", { issues: outcome.issues });
            break;
          case "refused":
            send("refused", { reason: outcome.reason });
            break;
          case "error":
            send("error", { code: outcome.code, message: outcome.message });
            break;
        }
      } catch (err) {
        // The stream is already open, so this cannot become a 500.
        send("error", {
          code: "unhandled",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
