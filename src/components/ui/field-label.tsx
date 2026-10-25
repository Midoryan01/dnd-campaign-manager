import type { LabelHTMLAttributes } from "react";

type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function FieldLabel({ className = "", ...props }: FieldLabelProps) {
  return (
    <label
      className={`field-label grid gap-1.5 text-[11px] text-[#d0c4af] [&_input]:min-h-[37px] [&_input]:w-full [&_input]:rounded-[5px] [&_input]:border [&_input]:border-[#494950] [&_input]:bg-[#15171c] [&_input]:px-[10px] [&_input]:py-[9px] [&_input]:text-[12px] [&_input]:text-[#eee4d2] [&_select]:min-h-[37px] [&_select]:w-full [&_select]:rounded-[5px] [&_select]:border [&_select]:border-[#494950] [&_select]:bg-[#15171c] [&_select]:px-[10px] [&_select]:py-[9px] [&_select]:text-[12px] [&_select]:text-[#eee4d2] [&_textarea]:min-h-[74px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[5px] [&_textarea]:border [&_textarea]:border-[#494950] [&_textarea]:bg-[#15171c] [&_textarea]:px-[10px] [&_textarea]:py-[9px] [&_textarea]:text-[12px] [&_textarea]:leading-[1.5] [&_textarea]:text-[#eee4d2] [&_input::placeholder]:text-[#756f66] [&_textarea::placeholder]:text-[#756f66]  [margin:11px_0]${className}`.trim()}
      {...props}
    />
  );
}
