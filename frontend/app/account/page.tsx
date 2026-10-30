import AccountDashboard from "@/components/account/AccountDashboard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth-cookies";
import { getShopProfile } from "@/lib/api/shop";

export default async function AccountPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has(ACCESS_COOKIE) && !cookieStore.has(REFRESH_COOKIE)) redirect("/login");
  const profile = await getShopProfile();
  return <div className="container max-w-7xl mx-auto px-4 py-10"><AccountDashboard currency={profile.currency} contactPhone={profile.phone} /></div>;
}
