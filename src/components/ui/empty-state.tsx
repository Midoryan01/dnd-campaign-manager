import type { HTMLAttributes } from "react";

type EmptyStateProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "aside" | "div" | "section";
};

export function EmptyState({ as: Element = "div", className = "", ...props }: EmptyStateProps) {
  return (
    <Element
      className={`empty-card flex min-h-40 flex-col items-center justify-center gap-[7px] rounded-[7px] border border-dashed border-[#51483a] bg-[#18191e] p-5 text-center [&_h3]:m-0 [&_h3]:font-serif [&_h3]:font-medium [&_h3]:text-[#ded1bb] [&_p]:mt-0 [&_p]:mb-[6px] [&_p]:max-w-[360px] [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-[#9e9789] ${className}`.trim()}
      {...props}
    />
  );
}
