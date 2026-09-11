import { ArcadeGame } from "@/components/arcade/ArcadeGame";
import { ArcadeSpec } from "@/lib/arcade/schema";
import { decodeSpec } from "@/lib/arcade/embed";

/**
 * The embeddable surface. No navigation, no page chrome, nothing but the game.
 *
 * This is what Pandai drops into a Blade template with one iframe tag and zero
 * integration work. It validates the spec exactly as every other surface does,
 * so an embed cannot render a game the rest of the system would refuse.
 */

export const metadata = {
  title: "Pandai game",
  other: { robots: "noindex" },
};

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;

  let spec: ArcadeSpec | null = null;
  let problem: string | null = null;

  if (!s) {
    problem = "No game supplied.";
  } else {
    try {
      const parsed = ArcadeSpec.safeParse(decodeSpec(s));
      if (parsed.success) spec = parsed.data;
      else problem = parsed.error.issues.map((i) => i.message).join("; ");
    } catch {
      problem = "That game could not be read.";
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        // Room for the stage's drop shadow. At 8px the frame edge cut the
        // shadow into a hard line - a box drawn round every embedded game, on
        // a Pandai page as much as on the deck. The 360x560 export snippet
        // still fits: a 312px stage is 468 tall, plus the credit line.
        padding: "var(--spacing-component-xl)",
        background: "var(--surface-general-page)",
      }}
    >
      {/* `data-fit` is the content's own box. The wrapper above is always the
          full height of whatever frame it is in, so it cannot say how tall the
          game is; this can, and `/deck` sizes its demo frames from it. */}
      <div data-fit style={{ width: "100%", display: "grid", justifyItems: "center" }}>
      {spec ? (
        <ArcadeGame spec={spec} />
      ) : (
        <p
          style={{
            fontSize: "var(--type-b3)",
            lineHeight: "var(--type-b3-lh)",
            color: "var(--text-warning-default)",
            textAlign: "center",
            maxWidth: "40ch",
          }}
        >
          {problem}
        </p>
      )}
      </div>
    </div>
  );
}
