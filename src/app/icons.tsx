import type { HTMLAttributes } from "react";

type MdProps = HTMLAttributes<HTMLSpanElement> & {
  name: string;
};

/** Google Material Icons ligature (loaded in index.html). */
export function MdIcon({ name, className, ...props }: MdProps) {
  return (
    <span
      className={className ? `material-icons ${className}` : "material-icons"}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}

export function IconNew(props: Omit<MdProps, "name">) {
  return <MdIcon name="note_add" {...props} />;
}
export function IconOpen(props: Omit<MdProps, "name">) {
  return <MdIcon name="folder_open" {...props} />;
}
export function IconOpenFile(props: Omit<MdProps, "name">) {
  return <MdIcon name="description" {...props} />;
}
export function IconOpenFolder(props: Omit<MdProps, "name">) {
  return <MdIcon name="folder_open" {...props} />;
}
export function IconSave(props: Omit<MdProps, "name">) {
  return <MdIcon name="save" {...props} />;
}
export function IconSaveAs(props: Omit<MdProps, "name">) {
  return <MdIcon name="save_as" {...props} />;
}
export function IconExportHtml(props: Omit<MdProps, "name">) {
  return <MdIcon name="html" {...props} />;
}
export function IconExportWord(props: Omit<MdProps, "name">) {
  return <MdIcon name="article" {...props} />;
}
export function IconThemes(props: Omit<MdProps, "name">) {
  return <MdIcon name="palette" {...props} />;
}
export function IconPreview(props: Omit<MdProps, "name">) {
  return <MdIcon name="visibility" {...props} />;
}
export function IconSplit(props: Omit<MdProps, "name">) {
  return <MdIcon name="vertical_split" {...props} />;
}
export function IconEdit(props: Omit<MdProps, "name">) {
  return <MdIcon name="edit" {...props} />;
}
export function IconLanguage(props: Omit<MdProps, "name">) {
  return <MdIcon name="language" {...props} />;
}
export function IconMinimize(props: Omit<MdProps, "name">) {
  return <MdIcon name="remove" {...props} />;
}
export function IconMaximize(props: Omit<MdProps, "name">) {
  return <MdIcon name="crop_square" {...props} />;
}
export function IconRestore(props: Omit<MdProps, "name">) {
  return <MdIcon name="filter_none" {...props} />;
}
export function IconClose(props: Omit<MdProps, "name">) {
  return <MdIcon name="close" {...props} />;
}
export function IconAbout(props: Omit<MdProps, "name">) {
  return <MdIcon name="info" {...props} />;
}
export function IconTabClose(props: Omit<MdProps, "name">) {
  return <MdIcon name="close" {...props} />;
}
