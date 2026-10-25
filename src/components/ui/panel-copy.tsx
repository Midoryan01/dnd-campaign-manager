import type { HTMLAttributes } from "react";

export function PanelCopy({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`mt-1 text-[11px] leading-[1.55] text-[#a59e91] ${className}`.trim()}
      {...props}
    />
  );
}
