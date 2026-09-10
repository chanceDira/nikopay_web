"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

export function SwaggerDocs() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;

    void import("swagger-ui-dist/swagger-ui-es-bundle.js").then((mod) => {
      if (cancelled || !hostRef.current) {
        return;
      }
      const SwaggerUIBundle = mod.default;
      host.innerHTML = "";
      SwaggerUIBundle({
        url: "/api/openapi",
        domNode: host,
        deepLinking: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
        docExpansion: "list",
        defaultModelsExpandDepth: 1,
        requestInterceptor: (req) => {
          req.credentials = "include";
          return req;
        },
      });
    });

    return () => {
      cancelled = true;
      host.innerHTML = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Link
        href="/admin"
        className="fixed top-3 left-3 z-50 rounded border border-neutral-300 bg-white px-2.5 py-1 font-sans text-xs text-neutral-700 hover:border-neutral-500"
      >
        Ops
      </Link>
      <div ref={hostRef} />
    </div>
  );
}
