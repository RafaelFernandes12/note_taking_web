import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

// Fontes empacotadas no app (funcionam offline, sem Google Fonts).
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/geist-mono";

import "@/styles/_variables.scss";
import "@/styles/_keyframe-animations.scss";
import "@/app/globals.css";
import "@/app/notes-theme.css";

import { router } from "@/router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
