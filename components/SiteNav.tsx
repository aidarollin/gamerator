"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * One header across every page.
 *
 * Every route was an island: the homepage was still the Phase 1 build plan and
 * linked nowhere, and none of `/create`, `/play/arcade` or `/ds` linked to each
 * other or back. You could only move around this site by editing the URL bar,
 * which is how the whole product stayed invisible to the person who asked for
 * it - he opened the root, saw a list of build phases, and reasonably concluded
 * that was the site.
 *
 * A client component only because the current route decides which link is
 * marked; the pages themselves stay server-rendered.
 */

const LINKS = [
  { href: "/create", label: "Make" },
  { href: "/play/arcade", label: "Play" },
  { href: "/ds", label: "Design system" },
] as const;

export function SiteNav() {
  const path = usePathname() ?? "/";
  // The embed route is pasted into other people's pages. Chrome would be
  // someone else's chrome appearing inside their layout.
  if (path.startsWith("/embed")) return null;

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border-general-default)",
        background: "var(--surface-general-default)",
      }}
    >
      <nav
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "var(--spacing-component-xs) var(--spacing-component-md)",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-component-md)",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            color: "var(--text-default-heading)",
          }}
        >
          gamerator
        </Link>
        <span style={{ flex: 1 }} />
        {LINKS.map((l) => {
          const on = path === l.href || path.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              style={{
                fontSize: 13,
                fontWeight: on ? 600 : 500,
                textDecoration: "none",
                color: on
                  ? "var(--text-primary-default)"
                  : "var(--text-default-body)",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
