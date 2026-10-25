import type { HTMLAttributes } from "react";

export function EmptyEmblem({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`text-[27px] font-serif text-[#c3a16a] ${className}`.trim()}
      {...props}
    />
  );
}
