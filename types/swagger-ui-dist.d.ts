declare module "swagger-ui-dist/swagger-ui-es-bundle.js" {
  type SwaggerUIBundleConfig = {
    url?: string;
    spec?: unknown;
    domNode?: HTMLElement | null;
    deepLinking?: boolean;
    persistAuthorization?: boolean;
    tryItOutEnabled?: boolean;
    docExpansion?: "list" | "full" | "none";
    defaultModelsExpandDepth?: number;
    requestInterceptor?: (req: {
      url: string;
      credentials?: RequestCredentials;
      headers?: Record<string, string>;
    }) => {
      url: string;
      credentials?: RequestCredentials;
      headers?: Record<string, string>;
    };
  };

  function SwaggerUIBundle(config: SwaggerUIBundleConfig): unknown;
  export default SwaggerUIBundle;
}

declare module "swagger-ui-dist/swagger-ui.css";
