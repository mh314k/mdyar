import type { PathKind } from "../platform/desktopFsOps";

export type ExplorerInlineDraft =
  | {
      mode: "create-file" | "create-folder";
      parentDir: string;
      draftName: string;
    }
  | {
      mode: "rename";
      path: string;
      kind: PathKind;
      draftName: string;
    };
