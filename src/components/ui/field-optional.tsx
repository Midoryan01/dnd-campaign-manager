import type { HTMLAttributes } from "react";

export function FieldOptional({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`ml-1 text-[10px] text-[#8e887e] ${className}`.trim()}
      {...props}
    />
  );
}
