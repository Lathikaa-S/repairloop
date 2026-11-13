// async/await keeps request → status check → JSON parsing in an explainable sequence.
export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(!(options.body instanceof FormData) && options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error?.message || `Request failed (${response.status})`,
    );
  }
  return response.status === 204 ? null : response.json();
}
export const send = (path, data, method = "POST") =>
  api(path, { method, body: JSON.stringify(data) });
// A closure retains one pending script Promise across clicks and avoids duplicate downloads.
export const loadCheckout = (() => {
  let pending;
  return () =>
    (pending ??= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => {
        pending = null;
        script.remove();
        reject(new Error("Could not load checkout. Check your connection."));
      };
      document.head.append(script);
    }));
})();
export async function streamAdvice(question, onEvent) {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || "Assistant unavailable");
  }
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "";
  // Fetch chunks need not align with SSE events; retain the incomplete tail between reads.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const lines = event.split("\n"),
        type = lines.find((l) => l.startsWith("event: "))?.slice(7),
        data = lines.find((l) => l.startsWith("data: "))?.slice(6);
      if (type && data) onEvent(type, JSON.parse(data));
    }
  }
}
