import type { VercelRequest, VercelResponse } from "@vercel/node";

function getPath(path: string | string[] | undefined): string {
  if (Array.isArray(path)) {
    return path.join("/");
  }
  return path ?? "";
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const apiKey = process.env.API_KEY;

  if (!backendUrl || !apiKey) {
    return response
      .status(500)
      .json({ detail: "Backend proxy is not configured" });
  }

  const incomingUrl = new URL(request.url ?? "/", "https://vercel.local");
  const targetUrl = `${backendUrl}/api/${getPath(request.query.path)}${incomingUrl.search}`;
  const headers = new Headers();

  if (request.headers["content-type"]) {
    headers.set("content-type", request.headers["content-type"]);
  }
  if (request.headers.accept) {
    headers.set("accept", request.headers.accept);
  }
  headers.set("x-api-key", apiKey);

  const method = request.method ?? "GET";
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : typeof request.body === "string"
        ? request.body
        : request.body === undefined
          ? undefined
          : JSON.stringify(request.body);

  try {
    const upstream = await fetch(targetUrl, { method, headers, body });
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      response.setHeader("content-type", contentType);
    }
    return response.status(upstream.status).send(await upstream.text());
  } catch {
    return response
      .status(502)
      .json({ detail: "Backend service is unavailable" });
  }
}
