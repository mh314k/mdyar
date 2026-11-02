import { useEffect, useState } from "react";
import { checkLatestRelease, type UpdateInfo } from "../updateCheck";

export function useDialogsAndUpdate() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void checkLatestRelease().then((info) => {
      if (!cancelled) setUpdate(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { aboutOpen, setAboutOpen, update };
}
