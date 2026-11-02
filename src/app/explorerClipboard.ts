import type { PathKind } from "../platform/desktopFsOps";

export type ExplorerClipboard = {
  mode: "copy" | "cut";
  path: string;
  kind: PathKind;
};

export type ExplorerSelection = {
  path: string;
  kind: PathKind;
} | null;
