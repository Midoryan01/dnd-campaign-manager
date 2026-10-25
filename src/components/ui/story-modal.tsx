import { Eyebrow } from "@/components/ui/eyebrow";
import type { ReactNode } from "react";
import { Button } from "./button";
import { Panel } from "./panel";

export function StoryModal({
  id,
  eyebrow,
  title,
  onClose,
  children,
  className = "",
}: {
  id: string;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className="tracker-modal-backdrop [position:fixed] [inset:0] [z-index:40] [display:grid] [place-items:center] [overflow:auto] [padding:20px] [background:#08090bd9]"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Panel
        as="section"
        className={`tracker-detail-modal  [width:min(680px,_100%)] [max-height:calc(100dvh_-_40px)] [overflow:auto] [padding:20px] [&_>_header]:[display:flex] [&_>_header]:[align-items:flex-start] [&_>_header]:[justify-content:space-between] [&_>_header]:[gap:16px] [&_>_header]:[margin-bottom:12px] [&_>_header_>_div]:[min-width:0] [&_>_header_button]:[flex:0_0_auto] [&_>_header_button]:[width:36px] [&_>_header_button]:[min-width:36px] [&_>_header_button]:[height:36px] [&_>_header_button]:[min-height:36px] [&_>_header_button]:[margin:0] [&_>_header_button]:[padding:0] [&_>_header_button]:[display:grid] [&_>_header_button]:[place-items:center] [&_>_header_button]:[font-size:20px] [&_>_header_button]:[line-height:1]${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header>
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 id={id}>{title}</h2>
          </div>
          <Button type="button" variant="quiet" onClick={onClose} aria-label="Tutup">&times;</Button>
        </header>
        {children}
      </Panel>
    </div>
  );
}
