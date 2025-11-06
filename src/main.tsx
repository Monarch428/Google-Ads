import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RouterProvider } from "./lib/router";

createRoot(document.getElementById("root")!).render(
  <RouterProvider>
    <App />
  </RouterProvider>,
);
