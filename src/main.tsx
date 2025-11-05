import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DataProvider } from "./lib/data-context";

createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <App />
  </DataProvider>
);
