import type { HTMLAttributes } from "react";

type EyebrowProps = HTMLAttributes<HTMLElement> & {
  as?: "small" | "span";
  tone?: "default" | "shop";
};

const tones = {
  default: "text-[#b59a6e]",
  shop: "text-[#b39b70]",
} as const;

export function Eyebrow({ as: Element = "span", tone = "default", className = "", ...props }: EyebrowProps) {
  return (
    <Element
      className={`eyebrow block text-[9px] font-bold tracking-[0.2em] ${tones[tone]} ${className}`.trim()}
      {...props}
    />
  );
}
