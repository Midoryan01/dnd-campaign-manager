import type { FormHTMLAttributes, HTMLAttributes } from "react";

type PanelProps = Omit<HTMLAttributes<HTMLElement>, "onSubmit"> & {
  as?: "article" | "aside" | "div" | "header" | "section";
  mobilePadding?: 14 | 15 | 16 | 17 | 22;
};

const mobilePaddingClasses = {
  14: "max-[650px]:p-[14px_16px]",
  15: "max-[650px]:p-[15px]",
  16: "max-[650px]:p-4",
  17: "max-[650px]:p-[17px]",
  22: "max-[650px]:p-[22px]",
} as const;
const panelClass =
  "panel min-w-0 rounded-lg border border-[#3a3a3e] bg-[linear-gradient(145deg,#202228f5,#1a1c21f5)] p-5 shadow-[0_12px_32px_#0002,inset_0_1px_#ffffff08]";

export function Panel({
  as: Element = "div",
  className = "",
  mobilePadding = 15,
  ...props
}: PanelProps) {
  return (
    <Element
      className={`${panelClass} ${mobilePaddingClasses[mobilePadding]} ${className}`.trim()}
      {...props}
    />
  );
}

type PanelFormProps = FormHTMLAttributes<HTMLFormElement>;

export function PanelForm({ className = "", ...props }: PanelFormProps) {
  return (
    <form
      className={`${panelClass} ${mobilePaddingClasses[15]} ${className}`.trim()}
      {...props}
    />
  );
}
