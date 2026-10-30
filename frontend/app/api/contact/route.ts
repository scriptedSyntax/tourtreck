import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { hasOnlyAllowedKeys, isValidEmail, isValidPhone, normalizeEmail, normalizePhone, normalizeText } from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { NextResponse } from "next/server";

const allowedChoices = {
  purpose: ["Buy a bicycle", "Find accessories", "Spare parts", "Delivery or pickup question"],
  rider: ["Adult commuter", "Student", "Child or teen", "Fitness or weekend rider"],
  budget: ["Below KES 10,000", "KES 10,000 - 30,000", "KES 30,000 - 80,000", "Above KES 80,000"],
  location: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Other town in Kenya"],
};

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request, 16 * 1024);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["purpose", "rider", "budget", "location", "name", "phone", "email", "message"])) return publicError(400);

  const payload = {
    purpose: normalizeText(body.purpose, 120),
    rider: normalizeText(body.rider, 120),
    budget: normalizeText(body.budget, 120),
    location: normalizeText(body.location, 120),
    name: normalizeText(body.name, 120),
    phone: normalizePhone(body.phone),
    email: normalizeEmail(body.email),
    message: normalizeText(body.message, 2000),
  };
  if (
    !allowedChoices.purpose.includes(payload.purpose) ||
    !allowedChoices.rider.includes(payload.rider) ||
    !allowedChoices.budget.includes(payload.budget) ||
    !allowedChoices.location.includes(payload.location) ||
    payload.name.length < 2 ||
    !isValidPhone(payload.phone) ||
    (payload.email && !isValidEmail(payload.email))
  ) return publicError(400, undefined, "Please check your contact details and selections.");

  try {
    const upstream = await fetch(backendUrl("shop/contact-inquiries/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Fingerprint": request.headers.get("x-csrf-token") ?? "",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    await readBackendResponse(upstream);
    if (!upstream.ok) return publicError(upstream.status);
    return noStore(NextResponse.json({ success: true }, { status: 201 }));
  } catch {
    return publicError(503);
  }
}
