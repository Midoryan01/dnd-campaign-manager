import type { ReactNode } from "react";

export function StoryCardLayout({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`story-card-layout  [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:10px] max-[650px]:[grid-template-columns:minmax(0,_1fr)]${className}`.trim()}>{children}</div>;
}
