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
        padding: "var(--spacing-component-xs)",
        background: "var(--surface-general-page)",
      }}
    >
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
  );
}
