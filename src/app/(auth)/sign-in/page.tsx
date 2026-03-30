import { redirect } from "next/navigation";
import { isErr } from "../../../domain/types/result";
import { requireSession } from "../../../infra/auth/require-session";
import { SignInForm } from "./sign-in-form";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSafeCallbackUrl(rawValue: string | string[] | undefined): string {
  const callbackUrl = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  return callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
    ? callbackUrl
    : "/editor";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);
  const session = await requireSession();

  if (!isErr(session)) {
    redirect(callbackUrl);
  }

  return <SignInForm callbackUrl={callbackUrl} />;
}
