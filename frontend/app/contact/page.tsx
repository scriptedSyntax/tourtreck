import ContactExperience from "@/components/contact/ContactExperience";
import { getShopProfile } from "@/lib/api/shop";
import type { ShopProfile } from "@/types/api";

const fallbackProfile: ShopProfile = {
  phone: "",
  whatsapp: "",
  email: "",
  location: "",
  currency: "KES",
  delivery_payment_timing: "BEFORE_DISPATCH",
  pickup_enabled: false,
};

export default async function ContactPage() {
  let profile = fallbackProfile;

  try {
    profile = await getShopProfile();
  } catch {
    // Keep the inquiry flow available if contact details are temporarily unavailable.
  }

  return <ContactExperience profile={profile} />;
}
