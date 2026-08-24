import { Suspense } from "react";
import SignInPage from "./sign-in-form";

export default function SignInRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-niko-teal border-t-transparent" />
        </div>
      }
    >
      <SignInPage />
    </Suspense>
  );
}
