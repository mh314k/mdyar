import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  value: string;
  depth: number;
  icon: ReactNode;
  ariaLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function ExplorerInlineInput({
  value,
  depth,
  icon,
  ariaLabel,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const initial = el.value;
    const dot = initial.lastIndexOf(".");
    if (dot > 0) el.setSelectionRange(0, dot);
    else el.select();
    // Focus once when the inline editor mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="mdyar-sidebar-row mdyar-tree-row is-inline-edit"
      style={{ paddingInlineStart: `${4 + depth * 12}px` }}
    >
      <span className="mdyar-tree-twistie mdyar-tree-twistie--spacer" aria-hidden="true" />
      {icon}
      <input
        ref={ref}
        className="mdyar-explorer-inline-input"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onSubmit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}
