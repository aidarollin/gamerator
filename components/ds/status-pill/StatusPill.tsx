import { statusStyle, type StatusKey } from "../tokens";
import s from "./status-pill.module.css";

/** On the DS Status colours. A stand-in until "Status Badge - 1.5" is read. */
export function StatusPill({
  kind,
  value,
  label,
}: {
  kind: StatusKey;
  value: number | string;
  label: string;
}) {
  return (
    <span className={s.status} style={statusStyle(kind)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}
