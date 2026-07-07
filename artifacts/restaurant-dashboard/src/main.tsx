import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Inject JWT token into every API call made by the generated client
setAuthTokenGetter(() => localStorage.getItem("bridge_jwt"));

createRoot(document.getElementById("root")!).render(<App />);
