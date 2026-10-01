import type { DsStatus } from "@/lib/ds/inventory";
import s from "./showcase.module.css";

export const STATUS_LABEL: Record<DsStatus, string> = {
  built: "Built",
  partial: "Partly built",
  planned: "Not built yet",
};

/** Says the state in words; the colour only repeats it. */
export function StatusTag({ status }: { status: DsStatus }) {
  return (
    <span className={`${s.status} type-b5`} data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}
