import type { HTMLAttributes } from "react";

type FieldRowProps = HTMLAttributes<HTMLDivElement>;

export function FieldRow({ className = "", ...props }: FieldRowProps) {
  return (
    <div
      className={`field-row flex gap-2.5 [&>label]:min-w-0 [&>label]:flex-1 max-[650px]:flex-col max-[650px]:gap-0 ${className}`.trim()}
      {...props}
    />
  );
}
