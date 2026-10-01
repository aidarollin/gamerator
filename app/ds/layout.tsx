import { DsMobileNav, DsNav } from "@/components/ds-showcase/DsNav";
import s from "@/components/ds-showcase/showcase.module.css";

/**
 * The Pandai DS 1.5 showcase. Every page under /ds shares this sidebar, which
 * lists the whole inventory - lib/ds/inventory.ts - built or not.
 */
export default function DsLayout({ children }: LayoutProps<"/ds">) {
  return (
    <div className={s.shell}>
      <aside className={s.side}>
        <DsNav />
      </aside>
      <main className={s.main}>
        <DsMobileNav />
        {children}
      </main>
    </div>
  );
}
