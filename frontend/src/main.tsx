import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RouterProvider } from "./lib/router";
import favicon from "./assets/e78fffddab88e738f7460441ac9695d5a0e809a4.png";

const faviconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
const link = faviconLink ?? document.createElement("link");
link.rel = "icon";
link.type = "image/png";
link.href = favicon;

if (!faviconLink) {
  document.head.appendChild(link);
}

createRoot(document.getElementById("root")!).render(
  <RouterProvider>
    <App />
  </RouterProvider>,
);
