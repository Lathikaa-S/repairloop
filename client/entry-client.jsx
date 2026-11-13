import React from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
import "./styles.css";
const initial = JSON.parse(
  document.getElementById("initial-state").textContent,
);
hydrateRoot(
  document.getElementById("root"),
  <BrowserRouter>
    <App initial={initial} />
  </BrowserRouter>,
);
