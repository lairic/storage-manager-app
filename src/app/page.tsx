import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RootPage() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("storage_tokens");
  const hasTokens = tokensCookie?.value && tokensCookie.value.length > 2;
  redirect(hasTokens ? "/dashboard" : "/setup");
}
