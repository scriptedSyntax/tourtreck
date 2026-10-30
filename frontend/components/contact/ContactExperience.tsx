"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ShopProfile } from "@/types/api";
import { CheckCircle, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { secureJsonHeaders } from "@/context/AuthContext";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone, normalizeText } from "@/lib/input-security";

type Inquiry = {
  purpose: string;
  rider: string;
  budget: string;
  location: string;
  name: string;
  phone: string;
  email: string;
  message: string;
};

const initialInquiry: Inquiry = {
  purpose: "",
  rider: "",
  budget: "",
  location: "",
  name: "",
  phone: "",
  email: "",
  message: "",
};

const choiceSteps = [
  {
    key: "purpose",
    title: "What can we help you with?",
    helper: "Pick the option closest to what you need.",
    options: ["Buy a bicycle", "Find accessories", "Spare parts", "Delivery or pickup question"],
  },
  {
    key: "rider",
    title: "Who is the bicycle for?",
    helper: "This helps us recommend the right size and type.",
    options: ["Adult commuter", "Student", "Child or teen", "Fitness or weekend rider"],
  },
  {
    key: "budget",
    title: "What budget range are you considering?",
    helper: "A rough range is enough.",
    options: ["Below KES 10,000", "KES 10,000 - 30,000", "KES 30,000 - 80,000", "Above KES 80,000"],
  },
  {
    key: "location",
    title: "Where are you located?",
    helper: "We currently serve customers within Kenya.",
    options: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Other town in Kenya"],
  },
] as const;

const NAME_STEP = choiceSteps.length;
const PHONE_STEP = NAME_STEP + 1;
const MESSAGE_STEP = PHONE_STEP + 1;
const SUMMARY_STEP = MESSAGE_STEP + 1;
const TOTAL_STEPS = SUMMARY_STEP + 1;

export default function ContactExperience({ profile }: { profile: ShopProfile }) {
  const [inquiry, setInquiry] = useState<Inquiry>(initialInquiry);
  const [step, setStep] = useState(0);
  const [showEmail, setShowEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [stepError, setStepError] = useState("");

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  const summary = useMemo(
    () => [
      ["Need", inquiry.purpose],
      ["Rider", inquiry.rider],
      ["Budget", inquiry.budget],
      ["Location", inquiry.location],
      ["Name", inquiry.name],
      ["Phone", inquiry.phone],
      ...(inquiry.email ? [["Email", inquiry.email]] : []),
      ...(inquiry.message ? [["Extra details", inquiry.message]] : []),
    ],
    [inquiry],
  );

  function updateField(key: keyof Inquiry, value: string) {
    if (stepError) setStepError("");
    setInquiry((current) => ({ ...current, [key]: value }));
  }

  function choose(key: keyof Inquiry, value: string) {
    setStepError("");
    updateField(key, value);
    setStep((current) => current + 1);
  }

  function goBack() {
    setStepError("");
    setStep((current) => Math.max(0, current - 1));
  }

  function continueFromName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeText(inquiry.name, 120);
    if (name.length >= 2) {
      updateField("name", name);
      setStep(PHONE_STEP);
    } else {
      setStepError("Enter your name to continue.");
    }
  }

  function continueFromPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = normalizePhone(inquiry.phone);
    const email = normalizeEmail(inquiry.email);
    if (isValidPhone(phone) && (!email || isValidEmail(email))) {
      updateField("phone", phone);
      updateField("email", email);
      setStep(MESSAGE_STEP);
    } else {
      setStepError(email && !isValidEmail(email) ? "Enter a valid email or leave it blank." : "Enter a valid phone number.");
    }
  }

  function continueFromMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep(SUMMARY_STEP);
  }

  async function submit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: secureJsonHeaders(),
        body: JSON.stringify(inquiry),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmitError(typeof data?.message === "string" ? data.message : "We couldn’t send your request. Please try again.");
        return;
      }
      setIsSubmitted(true);
    } catch {
      setSubmitError("We couldn’t send your request right now. Please try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setInquiry(initialInquiry);
    setStep(0);
    setShowEmail(false);
    setIsSubmitted(false);
  }

  const choiceStep = step < choiceSteps.length ? choiceSteps[step] : null;

  return (
    <div className="bg-background">
      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6 bg-primary text-primary-foreground">Talk to us</Badge>
            <h1 className="mb-6 text-4xl font-bold text-foreground lg:text-6xl">Need help choosing a bicycle?</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">Answer a few quick questions and we&apos;ll know how to guide you.</p>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  {!isSubmitted && (
                    <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  <CardTitle className="text-2xl font-bold">
                    {isSubmitted
                      ? "Thank you"
                      : choiceStep
                        ? choiceStep.title
                        : step === NAME_STEP
                          ? "Who should we call you?"
                          : step === PHONE_STEP
                            ? "And how do we reach you?"
                            : step === MESSAGE_STEP
                              ? "Anything else you want to tell us?"
                              : "Does everything look right?"}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {isSubmitted ? (
                    <div className="space-y-6 py-8 text-center">
                      <CheckCircle className="mx-auto h-14 w-14 text-primary" />
                      <div>
                        <h2 className="text-2xl font-semibold">Thanks, {inquiry.name}.</h2>
                        <p className="mt-2 text-muted-foreground">We&apos;ve received your request. We&apos;ll be in touch soon.</p>
                      </div>
                      <div className="flex flex-col justify-center gap-3 sm:flex-row">
                        <Button asChild><Link href="/cart">View Cart</Link></Button>
                        <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90"><Link href="/">Browse Products</Link></Button>
                        <Button type="button" variant="outline" onClick={reset}>Send Another Request</Button>
                      </div>
                    </div>
                  ) : choiceStep ? (
                    <div className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {choiceStep.options.map((option) => (
                          <Button
                            key={option}
                            type="button"
                            className="h-auto justify-start whitespace-normal bg-primary px-4 py-4 text-left text-primary-foreground hover:bg-primary/90"
                            onClick={() => choose(choiceStep.key, option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                      {step > 0 && <Button type="button" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={goBack}>Back</Button>}
                    </div>
                  ) : step === NAME_STEP ? (
                    <form onSubmit={continueFromName} className="space-y-5">
                      <Input required autoFocus maxLength={120} placeholder="Wanjiku Mwangi" value={inquiry.name} onChange={(event) => updateField("name", event.target.value)} />
                      {stepError && <p className="text-sm text-destructive" role="alert">{stepError}</p>}
                      <div className="flex gap-3">
                        <Button type="button" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={goBack}>Back</Button>
                        <Button type="submit">Next</Button>
                      </div>
                    </form>
                  ) : step === PHONE_STEP ? (
                    <form onSubmit={continueFromPhone} className="space-y-5">
                      <Input required autoFocus type="tel" inputMode="tel" maxLength={30} placeholder="0712 345 678" value={inquiry.phone} onChange={(event) => updateField("phone", event.target.value)} />
                      <div className="rounded-lg border border-border p-4">
                        <Button type="button" variant="ghost" className="h-auto w-full justify-between px-0 hover:bg-transparent" onClick={() => setShowEmail((current) => !current)} aria-expanded={showEmail}>
                          <span>Do you have an email? <span className="text-muted-foreground">(optional)</span></span>
                          <span aria-hidden="true">{showEmail ? "−" : "+"}</span>
                        </Button>
                        {showEmail && <Input className="mt-3" type="email" maxLength={254} placeholder="wanjiku@example.co.ke" value={inquiry.email} onChange={(event) => updateField("email", event.target.value)} />}
                      </div>
                      {stepError && <p className="text-sm text-destructive" role="alert">{stepError}</p>}
                      <div className="flex gap-3">
                        <Button type="button" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={goBack}>Back</Button>
                        <Button type="submit">Next</Button>
                      </div>
                    </form>
                  ) : step === MESSAGE_STEP ? (
                    <form onSubmit={continueFromMessage} className="space-y-5">
                      <Textarea autoFocus rows={5} maxLength={800} placeholder="Tell us anything else that may help." value={inquiry.message} onChange={(event) => updateField("message", event.target.value)} />
                      <div className="flex gap-3">
                        <Button type="button" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={goBack}>Back</Button>
                        <Button type="submit">Next</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <dl className="divide-y divide-border rounded-lg border border-border px-4">
                        {summary.map(([label, value]) => (
                          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[130px_1fr]">
                            <dt className="text-sm text-muted-foreground">{label}</dt>
                            <dd className="text-sm font-medium break-words">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="flex gap-3">
                        <Button type="button" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={goBack}>Back</Button>
                        <Button type="button" onClick={submit} disabled={isSubmitting}>
                          <Send className="mr-2 h-4 w-4" />{isSubmitting ? "Sending..." : "Send Request"}
                        </Button>
                      </div>
                      {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Contact details</CardTitle></CardHeader>
                <CardContent className="space-y-5 text-sm text-muted-foreground">
                  {profile.email && <a href={`mailto:${profile.email}`} className="flex items-start gap-3 hover:text-foreground"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{profile.email}</a>}
                  {profile.phone && <a href={`tel:${profile.phone}`} className="flex items-start gap-3 hover:text-foreground"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{profile.phone}</a>}
                  {profile.whatsapp && <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-foreground"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />WhatsApp: {profile.whatsapp}</a>}
                  {profile.location && <p className="flex items-start gap-3 whitespace-pre-line"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{profile.location}</p>}
                  {!profile.email && !profile.phone && !profile.whatsapp && !profile.location && <p>Contact details are temporarily unavailable.</p>}
                </CardContent>
              </Card>

              {!isSubmitted && (
                <Card>
                  <CardHeader><CardTitle>Your request so far</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {summary.slice(0, 4).map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-right font-medium">{value || "Not selected"}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-6">FAQ</Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">Common bicycle questions</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {[
              ["Do you deliver nationally?", "Yes, we serve customers within Kenya. Delivery details are confirmed during checkout or by the shop."],
              ["Can you help me choose the right size?", "Yes. Tell us your rider type and how you plan to use the bicycle, and we will guide you."],
              ["Do you sell accessories?", "Yes. You can ask about helmets, locks, pumps, lights, and other bicycle essentials."],
              ["Do you ship internationally?", "No. We currently serve Kenya only."],
            ].map(([question, answer]) => (
              <Card key={question}><CardContent className="p-6"><h3 className="mb-2 font-semibold">{question}</h3><p className="text-sm text-muted-foreground">{answer}</p></CardContent></Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
