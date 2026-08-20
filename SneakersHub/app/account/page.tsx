import { redirect } from "next/navigation";

const TAB_ROUTES: Record<string, string> = {
  listings: "/account/listings",
  saved: "/account/saved",
  analytics: "/account/analytics",
  settings: "/account/settings",
};

export default async function AccountIndex({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  redirect(TAB_ROUTES[tab ?? ""] ?? "/account/profile");
}