import { useEffect, useState } from "react";
import { runningOnDesktop } from "../../platform/fs";

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
  );

  useEffect(() => {
    void runningOnDesktop().then(setIsDesktop);
  }, []);

  return isDesktop;
}
