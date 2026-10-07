import SignInForm from "./sign-in-form";
// @ts-expect-error JavaScript helper is covered by the isolated PostgreSQL suite.
import { isPublicDemo } from "../../lib/public-demo.mjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <SignInForm publicDemo={isPublicDemo()} />;
}
