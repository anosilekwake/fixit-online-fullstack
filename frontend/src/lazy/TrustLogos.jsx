import React from "react";

export default function TrustLogos() {
  const logos = [
    { src: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Safaricom_logo.png", alt: "Safaricom" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Kenya.svg", alt: "Government of Kenya" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Mastercard_logo.png", alt: "Mastercard" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg", alt: "Visa" }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-6">Trusted By</h2>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {logos.map((logo, idx) => (
            <img
              key={idx}
              src={logo.src}
              alt={logo.alt}
              className="h-12 object-contain grayscale hover:grayscale-0 transition"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
