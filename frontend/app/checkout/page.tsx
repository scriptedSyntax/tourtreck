import CheckoutForm from "@/components/checkout/CheckoutForm";
import { getPaymentMethods, getShopProfile } from "@/lib/api/shop";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  try {
    const [profile, methods] = await Promise.all([getShopProfile(), getPaymentMethods()]);
    return <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10"><CheckoutForm profile={profile} paymentMethods={methods} /></div>;
  } catch {
    return <div className="min-h-[50vh] flex items-center justify-center text-center"><p>Checkout is temporarily unavailable. Please try again shortly.</p></div>;
  }
}
