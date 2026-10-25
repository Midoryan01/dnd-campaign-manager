import type { HTMLAttributes } from "react";

type StatusMessageProps = HTMLAttributes<HTMLElement> & {
  as?: "p" | "small";
  variant?: "form" | "toast";
};

export function StatusMessage({
  as: Element = "p",
  variant = "form",
  className = "",
  ...props
}: StatusMessageProps) {
  return (
    <Element
      className={`${variant === "form" ? "form-message" : "toast-message"} rounded-[5px] border border-[#66563e] bg-[#30291f] px-3 py-2.5 text-[12px] leading-[1.5] text-[#eed7aa] [&[role=alert]]:border-[#85545a] [&[role=alert]]:bg-[#332327] [&[role=alert]]:text-[#f0c9c7] ${className}`.trim()}
      {...props}
    />
  );
}
