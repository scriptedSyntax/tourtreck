"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { ContentPage, ShopProfile, SiteSettings } from "@/types/api";
import { ArrowRight, Github, LoaderCircle, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { secureJsonHeaders } from "@/context/AuthContext";
import { isValidEmail, normalizeEmail } from "@/lib/input-security";

export default function Footer({ site, profile, pages }: { site: SiteSettings; profile: ShopProfile; pages: ContentPage[] }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const footerSections = [
    {
      title: "Shop",
      links: [
        { href: "/products", label: "All Products" },
        { href: "/products?view=featured", label: "Featured" },
        { href: "/cart", label: "Shopping Cart" },
        { href: "/checkout", label: "Checkout" },
      ],
    },
    {
      title: "Customer Care",
      links: [
        { href: "/contact", label: "Contact Us" },
        { href: "/contact", label: "Delivery & Pickup" },
      ],
    },
    {
      title: "Information",
      links: [
        ...pages
          .filter((page) => page.show_in_footer)
          .map((page) => ({ href: `/info/${page.slug}`, label: page.title })),
      ],
    },
  ];

  async function subscribe(event: FormEvent) {
    event.preventDefault();
    setSubscriptionError("");
    setSubscribed(false);
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setSubscriptionError("Please enter a valid email address.");
      return;
    }
    setSubscribing(true);
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: secureJsonHeaders(), body: JSON.stringify({ email: normalizedEmail }) });
      if (response.ok) {
        setSubscribed(true);
        setEmail("");
      } else {
        setSubscriptionError("Subscription could not be saved. Please try again.");
      }
    } catch {
      setSubscriptionError("Subscription could not be saved. Please try again.");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 border-b border-border">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-foreground mb-4">Stay in the loop</h3>
            <p className="text-muted-foreground mb-6">Get updates about products and offers from {site.business_name}.</p>
            <form onSubmit={subscribe} className="flex max-w-md mx-auto gap-2">
              <Input type="email" placeholder="Enter your email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <Button type="submit" disabled={subscribing} aria-busy={subscribing}>{subscribing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}<span className="sr-only">{subscribing ? "Subscribing" : "Subscribe"}</span></Button>
            </form>
            {subscribed && <p className="text-sm text-green-700 mt-2">Thank you for subscribing.</p>}
            {subscriptionError && <p className="text-sm text-destructive mt-2">{subscriptionError}</p>}
          </div>
        </div>

        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <Link href="/" className="inline-block mb-4" aria-label={`${site.business_name} home`}>
                {site.logo ? <Image src={site.logo} alt={site.business_name} width={180} height={56} className="h-12 w-auto object-contain" /> : <span className="text-2xl font-semibold">{site.business_name}</span>}
              </Link>
              <p className="text-muted-foreground mb-6 max-w-sm">{site.default_seo_description || `Quality products from ${site.business_name}.`}</p>
              <div className="space-y-3">
                {profile.location && <p className="flex items-center gap-3 text-sm text-muted-foreground"><MapPin className="h-4 w-4 text-primary" />{profile.location}</p>}
                {profile.phone && <a href={`tel:${profile.phone}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground"><Phone className="h-4 w-4 text-primary" />{profile.phone}</a>}
                {profile.whatsapp && <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground"><MessageCircle className="h-4 w-4 text-primary" />{profile.whatsapp}</a>}
                {profile.email && <a href={`mailto:${profile.email}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground"><Mail className="h-4 w-4 text-primary" />{profile.email}</a>}
              </div>
            </div>

            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => <li key={`${section.title}-${link.label}`}><Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator />
        <div className="py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {site.business_name}. All rights reserved.</p>
          <a href="https://scriptedsyntax.github.io/myportfolio" target="_blank" rel="noreferrer" className="font-semibold hover:text-primary inline-flex items-center gap-1">
            <Github className="h-4 w-4" /> Improved and integrated by ScriptedSyntax
          </a>
        </div>
      </div>
    </footer>
  );
}
