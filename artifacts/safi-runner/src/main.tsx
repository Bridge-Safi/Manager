import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyResetEpoch } from "./lib/resetEpoch";

/* Remise à zéro globale : efface localStorage de chaque appareil au
   prochain chargement si l'epoch a été incrémenté. */
applyResetEpoch();

createRoot(document.getElementById("root")!).render(<App />);
