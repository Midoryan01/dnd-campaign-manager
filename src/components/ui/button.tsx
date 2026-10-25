import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "border-[#806844] bg-[linear-gradient(180deg,#8b6a3e,#6b4f2e)] text-[#fff0d5] hover:brightness-[1.14] hover:-translate-y-px",
  secondary:
    "border-[#62543d] bg-[linear-gradient(180deg,#35312a,#292721)] text-[#e6d1a7] hover:brightness-[1.14] hover:-translate-y-px",
  quiet:
    "min-h-auto border-transparent bg-transparent px-2 py-1.5 text-[10px] font-normal text-[#c5aa7b] shadow-none hover:bg-[#ffffff08]",
  danger: "border-[#714b50] bg-[#482b30] text-[#f0ceca]",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: keyof typeof variants;
};

const baseClass =
  "min-h-[38px] rounded-[5px] border px-[13px] py-[9px] text-[11px] font-bold tracking-[0.02em] shadow-[inset_0_1px_#ffffff20] transition-[filter,transform] duration-150";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button-${variant} inline-block ${baseClass} ${variants[variant]} ${className}`.trim()}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "secondary",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={`button-${variant} inline-flex ${baseClass} ${variants[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
