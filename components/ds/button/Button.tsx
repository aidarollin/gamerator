import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../cx";
import s from "./button.module.css";

/** Figma "Button - 1.5", Type=Student. Size L is DS-exact; M and S are not. */
export function Button({
  children,
  variant = "primary",
  size = "l",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
  size?: "l" | "m" | "s";
}) {
  return (
    <button
      type="button"
      className={cx(
        s.button,
        variant === "primary" && s.btnPrimary,
        variant === "secondary" && s.btnSecondary,
        variant === "tertiary" && s.btnTertiary,
        size === "m" && s.buttonM,
        size === "s" && s.buttonS,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
