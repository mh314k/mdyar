import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import { App } from "./app/App";
import { appWindowTitle } from "./app/meta";
import "./styles.css";

document.title = appWindowTitle();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
