import type { HTMLAttributes } from "react";

type StepMarkProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "default" | "large";
};

const sizes = {
  default: "h-[30px] w-[30px] text-[12px]",
  large: "h-10 w-10 text-sm",
} as const;

export function StepMark({ size = "default", className = "", ...props }: StepMarkProps) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-[#6a5738] font-serif text-[#dfbd82] ${sizes[size]} ${className}`.trim()}
      {...props}
    />
  );
}
