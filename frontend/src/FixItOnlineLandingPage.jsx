import React, { useState, useMemo, Suspense, lazy, useEffect } from "react";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  FaWhatsapp,
  FaCheckCircle,
  FaShieldAlt,
  FaLock,
  FaBolt,
  FaStar,
  FaExternalLinkAlt,
  FaMoneyBillWave,
  FaSearch,
} from "react-icons/fa";

// Lazy-load heavy/optional parts for better initial performance
const Testimonials = lazy(() => import("./lazy/Testimonials")); // create this file or replace with inline if you prefer
const TrustLogos = lazy(() => import("./lazy/TrustLogos"));

// IMPORTANT: install dependencies before using this file:
// npm i react-helmet-async framer-motion react-icons axios
// Optional: create ./_lazy/Testimonials.jsx and ./_lazy/TrustLogos.jsx as small components.

const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:4000/api";

const PAYBILL =
  import.meta.env?.VITE_PAYBILL || process.env.REACT_APP_PAYBILL || "000000";

const WHATSAPP_NUMBER =
  import.meta.env?.VITE_WHATSAPP || process.env.REACT_APP_WHATSAPP || "254700000000";

export default function FixItOnlineLandingPage() {
  // Form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "KRA",
    details: "",
    referral: "",
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [trackRef, setTrackRef] = useState("");
  const [refResult, setRefResult] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");

  // generate order ref stable for session
  const orderRef = useMemo(
    () => `FI-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  useEffect(() => {
    // Basic analytics hook: fire page view
    if (window.gtag) window.gtag("event", "page_view", { page_title: "FixIt Online" });
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function normalizeKenyaPhone(raw) {
    if (!raw) return null;
    let s = String(raw).trim().replace(/[\s\-().+]/g, "");
    if (/^0[17]\d{8}$/.test(s)) return "254" + s.slice(1);
    if (/^[7]\d{8}$/.test(s)) return "254" + s;
    if (/^2547\d{8}$/.test(s)) return s;
    return null;
  }

  function validateForm(data) {
    const errors = [];
    if (!data.name || data.name.trim().length < 2) errors.push("Enter your full name.");
    const normalized = normalizeKenyaPhone(data.phone);
    if (!normalized) errors.push("Enter a valid Kenyan phone (07xxxxxxxx).");
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Invalid email format.");
    if (!data.details || data.details.trim().length < 6) errors.push("Add details (ID / Logbook / Meter no.)");
    return { ok: errors.length === 0, errors, normalizedPhone: normalized };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const { ok, errors, normalizedPhone } = validateForm(form);
    if (!ok) {
      setErrorMsg(errors.join(" "));
      // analytics event
      if (window.gtag) window.gtag("event", "form_validation_error", { errors: errors.join(";") });
      return;
    }

    const payload = {
      ...form,
      phone: normalizedPhone,
      orderRef,
      source: "landing-page",
    };

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/submit`, payload, { timeout: 15000 });
      if (res?.data?.success) {
        setStatusMsg(`\u2705 Order submitted — Ref ${orderRef}. We'll WhatsApp you shortly.`);
        setShowSuccessModal(true);
        // analytics event
        if (window.gtag) window.gtag("event", "order_submitted", { orderRef, service: form.service });
        // clear form except referral for retention
        setForm({ name: "", phone: "", email: "", service: "KRA", details: "", referral: form.referral });
      } else {
        setErrorMsg(res?.data?.message || "Submission failed. Try again.");
      }
    } catch (err) {
      setErrorMsg("\u26A0 Network/server error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // M-Pesa STK mock - send request to backend that triggers STK push
  async function handleMpesa(amount = 500) {
    setErrorMsg(null);
    setStatusMsg(null);
    const phone = normalizeKenyaPhone(form.phone);
    if (!phone) return setErrorMsg("Enter a valid phone for M-Pesa.");

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/mpesa/stkpush`, { phone, amount, orderRef }, { timeout: 20000 });
      if (res?.data?.success) {
        setStatusMsg("\u2705 M-Pesa prompt sent. Complete on your phone.");
        if (window.gtag) window.gtag("event", "mpesa_initiated", { orderRef, amount });
      } else setErrorMsg(res?.data?.message || "M-Pesa initiation failed.");
    } catch (e) {
      setErrorMsg("M-Pesa currently unavailable. Try paybill: " + PAYBILL);
    } finally {
      setLoading(false);
    }
  }

  async function handleTrack(e) {
    e && e.preventDefault();
    setRefResult(null);
    if (!trackRef) return setRefResult({ error: "Enter a reference to track." });
    try {
      const res = await axios.get(`${API_BASE}/orders/${encodeURIComponent(trackRef)}`);
      setRefResult(res?.data || { error: "Not found" });
    } catch (err) {
      setRefResult({ error: "Tracking service unavailable." });
    }
  }

  async function subscribeNewsletter(e) {
    e && e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) return setErrorMsg("Enter a valid email for the newsletter.");
    try {
      await axios.post(`${API_BASE}/newsletter`, { email: newsletterEmail });
      setStatusMsg("Subscribed to updates — we'll send offers via WhatsApp & Email.");
      setNewsletterEmail("");
      if (window.gtag) window.gtag("event", "newsletter_subscribed");
    } catch (err) {
      setErrorMsg("Newsletter service failed.");
    }
  }

  // small helper to open WhatsApp with prefilled message and track click
  function openWhatsApp(prefill = "Hello, I need help with a service") {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(prefill)}`;
    if (window.gtag) window.gtag("event", "whatsapp_click", { prefill });
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white text-gray-900">
      <Helmet>
        <title>FixIt Online Kenyan document & service processing</title>
        <meta name="description" content="FixIt Online helps Kenyans process KRA, NTSA, passports, certificates & more quickly and securely. Fast, trusted, WhatsApp updates." />
        <meta property="og:title" content="FixIt Online — Fast KRA, NTSA & Certificates" />
        <meta property="og:description" content="Trusted by 10,000+ Kenyans. Submit details, pay via M-Pesa, and get updates on WhatsApp." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : 'https://fixitonline.co.ke'} />
        <meta property="og:image" content="/og-image.png" />
        <script type="application/ld+json">{`{
          "@context":"https://schema.org",
          "@type":"LocalBusiness",
          "name":"FixIt Online",
          "url":"https://fixitonline.co.ke",
          "telephone":"+254700000000",
          "sameAs":[],
          "address":{
            "@type":"PostalAddress",
            "addressCountry":"KE"
          }
        }`}</script>
      </Helmet>

      {/* HEADER */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-700 flex items-center justify-center text-white font-bold">FI</div>
            <h1 className="font-extrabold text-lg">FixIt Online</h1>
            <span className="ml-3 text-xs text-gray-500">Trusted • Secure • Fast</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#services" className="hover:text-green-600">Services</a>
            <a href="#pricing" className="hover:text-green-600">Pricing</a>
            <a href="#how" className="hover:text-green-600">How</a>
            <a href="#faq" className="hover:text-green-600">FAQ</a>
            <a href="#contact" className="hover:text-green-600">Contact</a>
            <button onClick={() => openWhatsApp()} className="bg-green-600 text-white px-4 py-2 rounded shadow flex items-center gap-2">
              <FaWhatsapp /> Chat
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="container mx-auto px-6 py-10 grid lg:grid-cols-2 gap-10 items-center">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Stop queuing. Let <span className="text-green-700">FixIt Online</span> do the work.
          </h2>
          <p className="mt-2 text-lg text-gray-600">KRA • NTSA • Passports • Certificates — secure processing with WhatsApp updates. Trusted by 10,000+ Kenyans.</p>

          <div className="mt-6 flex gap-4">
            <a href="#contact" className="bg-green-600 text-white px-6 py-3 rounded-md shadow hover:bg-green-700">Get Started</a>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="border border-green-600 text-green-700 px-6 py-3 rounded-md">View Pricing</button>
          </div>

          <div className="flex items-center gap-3 mt-6 text-sm text-gray-600">
            <FaShieldAlt className="text-green-600" /> 100% Secure Processing
            <FaBolt className="text-yellow-500 ml-4" /> Fast Delivery
          </div>

          <div className="mt-6 flex gap-3 items-center">
            <div className="bg-white p-3 rounded shadow"> <FaCheckCircle className="text-green-700" /> </div>
            <div>
              <div className="text-sm text-gray-500">Most popular</div>
              <div className="font-bold">Standard — Ksh 1,000</div>
            </div>
          </div>
        </motion.div>

        {/* FORM */}
        <motion.aside initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-lg shadow-xl p-6">
          <h3 className="font-bold text-lg">Submit your request</h3>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input name="name" value={form.name} onChange={handleChange} placeholder="Full name" className="w-full px-3 py-2 border rounded" />
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="07XXXXXXXX" className="w-full px-3 py-2 border rounded" />
            </div>

            <input name="email" value={form.email} onChange={handleChange} placeholder="Email (optional)" className="w-full px-3 py-2 border rounded" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select name="service" value={form.service} onChange={handleChange} className="w-full px-3 py-2 border rounded">
                <option>KRA</option>
                <option>NTSA</option>
                <option>Good Conduct</option>
                <option>Passport</option>
                <option>NHIF/NSSF</option>
                <option>Other</option>
              </select>
              <input name="referral" value={form.referral} onChange={handleChange} placeholder="Referral code (optional)" className="w-full px-3 py-2 border rounded" />
            </div>

            <textarea name="details" value={form.details} onChange={handleChange} placeholder="Details (ID / Logbook / Meter no.)" className="w-full px-3 py-2 border rounded" />

            <div className="grid grid-cols-2 gap-2">
              <button type="submit" disabled={loading} className="bg-green-700 text-white px-4 py-2 rounded w-full">{loading ? "Submitting..." : "Submit Request"}</button>
              <button type="button" onClick={() => handleMpesa(1000)} disabled={loading} className="bg-yellow-500 text-black px-4 py-2 rounded w-full flex items-center justify-center gap-2"><FaMoneyBillWave /> Pay Ksh 1,000</button>
            </div>
          </form>

          {statusMsg && <p className="text-green-600 mt-2">{statusMsg}</p>}
          {errorMsg && <p className="text-red-600 mt-2">{errorMsg}</p>}

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <div>Paybill: <strong>{PAYBILL}</strong></div>
            <div>Secure • GDPR-ready</div>
          </div>

          <div className="mt-4 text-center">
            <button onClick={() => setShowTracking(true)} className="text-sm underline">Track Order</button>
          </div>
        </motion.aside>
      </section>

      {/* TRUST + TESTIMONIALS */}
      <section className="bg-green-50 py-8">
        <div className="container mx-auto px-6 flex flex-wrap justify-center gap-8">
          <div className="flex items-center gap-2"><FaCheckCircle className="text-green-600" /> 10,000+ Happy Clients</div>
          <div className="flex items-center gap-2"><FaStar className="text-yellow-500" /> Rated 4.9/5</div>
          <div className="flex items-center gap-2"><FaLock className="text-gray-600" /> Secure & Confidential</div>
        </div>

        <div className="container mx-auto px-6 mt-6">
          <Suspense fallback={<div>Loading testimonials...</div>}>
            <Testimonials />
          </Suspense>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-12">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-6">Our Top Services</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "KRA", desc: "PIN, Returns, Compliance made easy.", icon: "💼" },
              { title: "NTSA", desc: "Driving licenses, logbooks, and more.", icon: "🚗" },
              { title: "Certificates", desc: "Good conduct, passports, NHIF, NSSF.", icon: "📜" },
            ].map((s, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }} className="p-6 border rounded shadow hover:shadow-lg bg-white">
                <div className="text-3xl">{s.icon}</div>
                <h4 className="font-bold mt-3">{s.title}</h4>
                <p className="text-sm text-gray-600 mt-2">{s.desc}</p>
                <div className="mt-3">
                  <button onClick={() => { setForm(prev => ({...prev, service: s.title})); document.getElementById('contact')?.scrollIntoView({behavior: 'smooth'}); }} className="text-sm underline">Order {s.title}</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-12 bg-gray-100">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-6">Transparent Pricing</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Basic", price: "Ksh 500", perks: ["1 Service", "Standard Support"] },
              { name: "Standard", price: "Ksh 1000", perks: ["2 Services", "Priority Support"], popular: true },
              { name: "Premium", price: "Ksh 2000", perks: ["Unlimited Requests", "VIP Support"] },
            ].map((p, i) => (
              <div key={i} className={`p-6 rounded shadow bg-white ${p.popular ? "border-2 border-green-600 scale-105 transform" : ""}`}>
                <h4 className="font-bold text-lg">{p.name}</h4>
                <p className="text-3xl font-extrabold mt-2">{p.price}</p>
                <ul className="mt-3 space-y-1 text-gray-600">{p.perks.map((perk, idx) => <li key={idx}>✅ {perk}</li>)}</ul>
                <div className="mt-4">
                  <button onClick={() => { setForm(prev => ({...prev, service: p.name})); document.getElementById('contact')?.scrollIntoView({behavior: 'smooth'}); }} className="bg-green-700 text-white px-4 py-2 rounded">Choose</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-12">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-6">How it Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 border rounded shadow">1️⃣ Submit details</div>
            <div className="p-6 border rounded shadow">2️⃣ Pay via M-Pesa</div>
            <div className="p-6 border rounded shadow">3️⃣ Updates via WhatsApp</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-green-50 py-12">
        <div className="container mx-auto px-6">
          <h3 className="text-2xl font-bold mb-6 text-center">FAQs</h3>
          <div className="space-y-4 max-w-2xl mx-auto">
            <details className="p-4 border rounded bg-white"><summary className="font-semibold">How do I pay?</summary><p>We accept M-Pesa Paybill: {PAYBILL} or STK Push via phone.</p></details>
            <details className="p-4 border rounded bg-white"><summary className="font-semibold">Is it safe?</summary><p>Yes ✅ We are licensed and handle your data securely.</p></details>
            <details className="p-4 border rounded bg-white"><summary className="font-semibold">How fast is service?</summary><p>Most requests are completed within 24-48 hours.</p></details>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-12 text-center">
        <h3 className="text-2xl font-bold mb-6">Contact Us</h3>
        <p className="mb-4">WhatsApp: <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="text-green-600 font-bold">{WHATSAPP_NUMBER}</a></p>
        <p>Email: support@fixitonline.co.ke</p>

        <div className="mt-6 max-w-md mx-auto">
          <form onSubmit={subscribeNewsletter} className="flex gap-2">
            <input value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} placeholder="Enter email for updates" className="px-3 py-2 border rounded flex-1" />
            <button className="bg-green-700 text-white px-4 py-2 rounded">Subscribe</button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white py-6 text-center text-sm text-gray-600">
        © FixIt Online {new Date().getFullYear()} | Paybill: <strong>{PAYBILL}</strong>
      </footer>

      {/* Floating WhatsApp CTA */}
      <button onClick={() => openWhatsApp()} className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg flex items-center gap-2 z-50">
        <FaWhatsapp /> Chat
      </button>

      {/* Floating Order Now */}
      <a href="#contact" className="fixed bottom-6 left-6 bg-yellow-400 text-black px-4 py-3 rounded-full shadow-lg z-40">Order Now</a>

      {/* Tracking Modal */}
      {showTracking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold">Track your order</h4>
              <button onClick={() => setShowTracking(false)}>Close</button>
            </div>
            <form onSubmit={handleTrack} className="flex gap-2 mb-4">
              <input value={trackRef} onChange={e => setTrackRef(e.target.value)} placeholder="Enter reference" className="flex-1 px-3 py-2 border rounded" />
              <button className="bg-green-700 text-white px-4 py-2 rounded">Search</button>
            </form>
            <div>
              {refResult ? (
                refResult.error ? <div className="text-red-600">{refResult.error}</div> : <pre className="text-sm bg-gray-100 p-3 rounded">{JSON.stringify(refResult, null, 2)}</pre>
              ) : <div className="text-gray-500">Enter a reference above to view status.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded max-w-sm w-full text-center">
            <h4 className="font-bold text-lg">Order Submitted</h4>
            <p className="mt-2">Reference: <strong>{orderRef}</strong></p>
            <p className="mt-2 text-sm text-gray-600">We've started processing — expect a WhatsApp update shortly.</p>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={() => { setShowSuccessModal(false); openWhatsApp(`Hello, my order ref is ${orderRef}`); }} className="bg-green-700 text-white px-4 py-2 rounded">Open WhatsApp</button>
              <button onClick={() => setShowSuccessModal(false)} className="px-4 py-2 rounded border">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/*
Notes (in-code):
- Performance: lazy-loaded testimonials & logos reduce first paint size. Use Vite's code-splitting by placing optional parts in separate files.
- SEO: react-helmet-async used to inject meta tags and structured data. Add /og-image.png to public folder.
- Trust & Conversion: floating WhatsApp CTA, Paybill + STK mock, testimonials, trust badges, pricing highlight and referral input.
- Analytics: calls to window.gtag included — wire Google Analytics / GTM in index.html.
- Backend: expects endpoints: POST /submit, POST /mpesa/stkpush, POST /newsletter, GET /orders/:ref. Implement retries on server or add axios-retry if desired.
- To further improve: integrate server-side rendering (SSR) for perfect SEO and initial load, add image optimization and webp assets, and set up A/B testing for pricing copy.
*/
