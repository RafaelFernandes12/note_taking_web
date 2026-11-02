import { createBrowserRouter } from "react-router";
import { ErrorScreen, LoadingScreen, RootLayout } from "@/root-layout";
import { HomePage, homeLoader } from "@/routes/home-page";
import { NotePage, noteLoader } from "@/routes/note-page";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    HydrateFallback: LoadingScreen,
    ErrorBoundary: ErrorScreen,
    children: [
      { path: "/", loader: homeLoader, Component: HomePage },
      { path: "/page/:id", loader: noteLoader, Component: NotePage },
      // Página de teste do editor do template, com o conteúdo de exemplo.
      { path: "/simple", lazy: () => import("@/routes/simple-page") },
    ],
  },
]);
