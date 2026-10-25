import type { HTMLAttributes } from "react";

type SectionHeadingProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "header";
  variant?: "default" | "centered" | "compact" | "shop";
};

const variants = {
  default: "items-start mb-4",
  centered: "items-center mb-4",
  compact: "items-center mb-1 [&_h2]:my-1",
  shop: "items-start mb-3 [&_h2]:my-1",
} as const;

export function SectionHeading({ as: Element = "div", variant = "default", className = "", ...props }: SectionHeadingProps) {
  return (
    <Element
      className={`flex justify-between gap-3 ${variants[variant]} [&_p]:mt-1 [&_p]:text-[11px] [&_p]:leading-[1.55] [&_p]:text-[#a59e91] ${className}`.trim()}
      {...props}
    />
  );
}
