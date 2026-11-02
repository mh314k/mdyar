import { MdIcon } from "./icons";

export type FileTypeIconSpec =
  | { kind: "badge"; label: string; tone: string }
  | { kind: "icon"; icon: string; tone: string }
  | { kind: "app"; tone: "md" };

export function fileTypeIconSpec(fileName: string): FileTypeIconSpec {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  const lower = base.toLowerCase();

  if (/\.tsx$/.test(lower)) return { kind: "badge", label: "TS", tone: "tsx" };
  if (/\.ts$/.test(lower)) return { kind: "badge", label: "TS", tone: "typescript" };
  if (/\.jsx$/.test(lower)) return { kind: "badge", label: "JS", tone: "jsx" };
  if (/\.(mjs|cjs|js)$/.test(lower)) return { kind: "badge", label: "JS", tone: "javascript" };
  if (/\.json$/.test(lower)) return { kind: "badge", label: "{}", tone: "json" };
  if (/\.(yaml|yml)$/.test(lower)) return { kind: "badge", label: "Y", tone: "yaml" };
  if (/\.toml$/.test(lower) || lower === "cargo.toml") return { kind: "badge", label: "T", tone: "toml" };
  if (/\.rs$/.test(lower)) return { kind: "badge", label: "RS", tone: "rust" };
  if (/\.(md|markdown|mdown)$/.test(lower)) return { kind: "app", tone: "md" };
  if (/\.(txt|text|log)$/.test(lower)) return { kind: "icon", icon: "subject", tone: "text" };
  if (/\.html?$/.test(lower)) return { kind: "badge", label: "<>", tone: "html" };
  if (/\.css$/.test(lower)) return { kind: "badge", label: "#", tone: "css" };
  if (/\.scss$/.test(lower)) return { kind: "badge", label: "S", tone: "scss" };
  if (/\.svg$/.test(lower)) return { kind: "icon", icon: "image", tone: "svg" };
  if (/\.(png|jpe?g|gif|webp|bmp|ico)$/.test(lower)) return { kind: "icon", icon: "image", tone: "image" };
  if (/\.(py|rb|go|java|kt|cs|cpp|c|h|swift)$/.test(lower)) return { kind: "icon", icon: "code", tone: "code" };
  if (/\.pdf$/.test(lower)) return { kind: "icon", icon: "picture_as_pdf", tone: "pdf" };
  if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) return { kind: "icon", icon: "folder_zip", tone: "archive" };
  if (/\.gitignore$/.test(lower)) return { kind: "icon", icon: "block", tone: "git" };
  if (/\.lock$/.test(lower)) return { kind: "icon", icon: "lock", tone: "lock" };
  return { kind: "icon", icon: "insert_drive_file", tone: "generic" };
}

function fileTypeIconClassName(tone: string): string {
  return `mdyar-ft-icon mdyar-ft-icon--${tone}`;
}

export function formatTabLabel(fileName: string, dirty: boolean): string {
  return dirty ? `* ${fileName}` : fileName;
}

type FileTypeIconProps = {
  fileName: string;
  className?: string;
};

export function FileTypeIcon({ fileName, className }: FileTypeIconProps) {
  const spec = fileTypeIconSpec(fileName);
  const extra = className ? ` ${className}` : "";

  if (spec.kind === "app") {
    return (
      <img
        src={`${import.meta.env.BASE_URL}mdyar.svg`}
        alt=""
        width={16}
        height={16}
        draggable={false}
        className={`mdyar-ft-icon mdyar-ft-icon--app${extra}`}
        title={fileName}
      />
    );
  }

  if (spec.kind === "badge") {
    return (
      <span
        className={`${fileTypeIconClassName(spec.tone)}${extra}`}
        aria-hidden="true"
        title={fileName}
      >
        {spec.label}
      </span>
    );
  }

  return (
    <MdIcon
      name={spec.icon}
      className={`${fileTypeIconClassName(spec.tone)}${extra}`}
      title={fileName}
    />
  );
}
