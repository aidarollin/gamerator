"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { SEMANTIC_SETS } from "@/lib/ds/colour-cards";
import { DS_GROUPS, DS_INVENTORY } from "@/lib/ds/inventory";
import { STATUS_LABEL } from "./StatusTag";
import s from "./showcase.module.css";

/**
 * The showcase sidebar. Every component in the inventory is listed, built or
 * not - a planned one has a page saying so, which is the point.
 *
 * A client component only to mark the current page.
 */
export function DsNav() {
  const path = usePathname() ?? "/ds";
  const top = (href: string, label: string) => (
    <Link
      href={href}
      className={`${s.navLink} type-b3`}
      aria-current={path === href ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return (
    <nav className={s.nav} aria-label="Design system">
      <div className={s.navGroup}>
        {top("/ds", "Overview")}
      </div>
      <div className={s.navGroup}>
        <span className={`${s.navHeading} type-b5`}>Foundations</span>
        {top("/ds/foundations", "All foundations")}
        {top("/ds/foundations/primitives", "Primitive colours")}
        {SEMANTIC_SETS.map((c) => (
          <Fragment key={c.slug}>{top(`/ds/foundations/${c.slug}`, c.title)}</Fragment>
        ))}
      </div>
      {DS_GROUPS.map((g) => {
        const items = DS_INVENTORY.filter((e) => e.group === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key} className={s.navGroup}>
            <span className={`${s.navHeading} type-b5`}>{g.label}</span>
            {items.map((e) => {
              const href = `/ds/components/${e.slug}`;
              return (
                <Link
                  key={e.slug}
                  href={href}
                  className={`${s.navLink} ${e.status === "planned" ? s.navPlanned : ""} type-b3`}
                  aria-current={path === href ? "page" : undefined}
                >
                  <span className={s.dot} data-status={e.status} aria-hidden="true" />
                  {e.name}
                  <span className="sr-only">, {STATUS_LABEL[e.status]}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * The same nav folded into a disclosure for a phone. Keyed on the path so it
 * closes itself after you pick a page - the layout persists across
 * navigations, and an open menu would otherwise sit over the page you chose.
 */
export function DsMobileNav() {
  const path = usePathname() ?? "/ds";
  return (
    <details key={path} className={s.mobileNav}>
      <summary className="type-b1">Browse the design system</summary>
      <DsNav />
    </details>
  );
}
