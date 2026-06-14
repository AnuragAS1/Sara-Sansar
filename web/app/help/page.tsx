"use client";

import { FormEvent, useState } from "react";
import { Mail, Phone, MapPin, MessageCircle, Info, CheckCircle, Send, Heart, Target, Shield } from "lucide-react";
import Link from "next/link";

type Tab = "contact" | "about";

export default function HelpPage() {
  const [tab, setTab] = useState<Tab>("contact");

  return (
    <div className="max-w-4xl mx-auto container-fluid py-10 sm:py-16 rise">
      <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-3">Help</p>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest mb-3 font-semibold">
        How can we help?
      </h1>
      <p className="text-mute text-sm sm:text-base mb-8">
        Have a question, concern, or just want to know more about us? We're here for you.
      </p>

      {/* Tab selector */}
      <div className="flex gap-1 bg-[var(--bg)] rounded-xl p-1 mb-8 w-fit">
        <button onClick={() => setTab("contact")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "contact" ? "bg-emerald-500 text-white" : "text-mute hover:text-[var(--fg)]"
          }`}>
          <MessageCircle size={14} className="inline mr-1.5 -mt-0.5" /> Contact Us
        </button>
        <button onClick={() => setTab("about")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "about" ? "bg-emerald-500 text-white" : "text-mute hover:text-[var(--fg)]"
          }`}>
          <Info size={14} className="inline mr-1.5 -mt-0.5" /> About Us
        </button>
      </div>

      {tab === "contact" ? <ContactSection /> : <AboutSection />}
    </div>
  );
}

// ── Contact Form ──────────────────────────────────────────────────────────────
function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    // Simulate sending — in production, wire to an API endpoint
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="surface rounded-2xl p-12 text-center">
        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="font-display text-2xl tracking-tightest mb-2">Message sent!</h2>
        <p className="text-mute text-sm mb-6">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
        <button onClick={() => setSent(false)} className="btn-ghost">Send another message</button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Form */}
      <div className="lg:col-span-3">
        <div className="surface rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl tracking-tightest mb-1 font-semibold">Send us a message</h2>
          <p className="text-mute text-sm mb-6">Fill in the form below and we'll respond as soon as possible.</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">FULL NAME *</label>
                <input value={name} onChange={e => setName(e.target.value)} required className="field" placeholder="Your name" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">EMAIL *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="field" placeholder="you@email.com" />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">PHONE</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="field" placeholder="+977-98XXXXXXXX" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">YOUR CONCERN *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} className="field"
                placeholder="Tell us what you need help with…" />
            </div>
            <button type="submit" disabled={busy || !name || !email || !message} className="btn-primary w-full flex items-center justify-center gap-2">
              <Send size={14} /> {busy ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>
      </div>

      {/* Contact info sidebar */}
      <div className="lg:col-span-2 space-y-4">
        <div className="surface rounded-2xl p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Get in touch</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Mail size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Email</div>
                <a href="mailto:info@sarasansar.np" className="text-mute hover:text-emerald-500 transition-colors">info@sarasansar.np</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Phone</div>
                <a href="tel:+977-1-4000000" className="text-mute hover:text-emerald-500 transition-colors">+977-1-4000000</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Office</div>
                <p className="text-mute">Putalisadak, Kathmandu<br />Nepal 44600</p>
              </div>
            </div>
          </div>
        </div>
        <div className="surface rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold mb-2">Office hours</h3>
          <div className="text-sm text-mute space-y-1">
            <p>Sunday – Friday: 10:00 AM – 6:00 PM</p>
            <p>Saturday: Closed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── About Us ──────────────────────────────────────────────────────────────────
function AboutSection() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="surface rounded-2xl p-8 sm:p-12">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tightest mb-4 font-semibold">Our story</h2>
          <p className="text-mute leading-relaxed mb-4">
            Sara Sansar (सारासंसार) was born from a simple belief: finding a home in Nepal shouldn't be
            complicated. In a market where information is scattered across WhatsApp groups, newspaper classifieds,
            and word of mouth, we set out to build a transparent, modern platform that connects buyers, renters,
            and agents in one place.
          </p>
          <p className="text-mute leading-relaxed mb-4">
            Founded in Kathmandu, we understand the unique needs of Nepali property seekers — from
            navigating Ropani-Aana land measurements to finding bank-loan-eligible homes. Every feature we
            build starts with a question: "Does this make the journey easier?"
          </p>
          <p className="text-mute leading-relaxed">
            Today, Sara Sansar serves property listings across Kathmandu Valley, Pokhara, Biratnagar, and
            beyond — with verified agents, detailed property profiles, and the tools to make confident
            decisions about your biggest investment.
          </p>
        </div>
      </div>

      {/* Mission / Vision / Values */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="surface rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center mx-auto mb-4">
            <Target size={24} className="text-emerald-600" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-2">Our mission</h3>
          <p className="text-mute text-sm leading-relaxed">
            To democratize real estate in Nepal by making property information accessible, transparent,
            and trustworthy for every Nepali — whether buying their first home or investing in their tenth.
          </p>
        </div>
        <div className="surface rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 grid place-items-center mx-auto mb-4">
            <Heart size={24} className="text-amber-600" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-2">Our values</h3>
          <p className="text-mute text-sm leading-relaxed">
            Transparency first. We believe every listing should show real prices, real photos, and real
            details — no hidden fees, no bait-and-switch, no misleading descriptions.
          </p>
        </div>
        <div className="surface rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 grid place-items-center mx-auto mb-4">
            <Shield size={24} className="text-blue-600" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-2">Our goal</h3>
          <p className="text-mute text-sm leading-relaxed">
            To become Nepal's most trusted real estate platform — where every verified listing,
            every agent interaction, and every transaction builds confidence in the market.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="surface rounded-2xl p-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        <div>
          <div className="font-display text-3xl font-bold text-emerald-600">500+</div>
          <div className="text-mute text-xs uppercase tracking-widest mt-1">Active listings</div>
        </div>
        <div>
          <div className="font-display text-3xl font-bold text-emerald-600">50+</div>
          <div className="text-mute text-xs uppercase tracking-widest mt-1">Verified agents</div>
        </div>
        <div>
          <div className="font-display text-3xl font-bold text-emerald-600">5</div>
          <div className="text-mute text-xs uppercase tracking-widest mt-1">Cities covered</div>
        </div>
        <div>
          <div className="font-display text-3xl font-bold text-emerald-600">1000+</div>
          <div className="text-mute text-xs uppercase tracking-widest mt-1">Happy users</div>
        </div>
      </div>
    </div>
  );
}
