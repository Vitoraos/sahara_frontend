import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/types/api";

const auth: Middleware = {
  async onRequest({ request }) {
    try {
      const token = localStorage.getItem("sahara_token");
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
    } catch {
      /* SSR / private mode: unauthenticated */
    }
    return request;
  },
};

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});
api.use(auth);
