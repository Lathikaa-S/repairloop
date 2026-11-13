import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "./App.jsx";
// Public catalog HTML is sent before JavaScript runs. Private data is fetched after authentication.
export function render(url, initial) {
  return renderToString(
    <StaticRouter location={url}>
      <App initial={initial} />
    </StaticRouter>,
  );
}
