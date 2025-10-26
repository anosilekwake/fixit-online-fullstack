import React from "react";
import { FaStar } from "react-icons/fa";

export default function Testimonials() {
  const items = [
    { name: "Jane W.", text: "FixIt Online helped me get my KRA PIN in 10 mins!" },
    { name: "David K.", text: "Passport renewal was super smooth and stress-free." },
    { name: "Grace M.", text: "Affordable and very reliable services. I recommend them!" },
  ];

  return (
    <section className="py-16 bg-gray-50" id="testimonials">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">What Our Clients Say</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <div key={i} className="p-6 bg-white rounded-xl shadow">
              <div className="flex text-yellow-500 mb-2">
                {[...Array(5)].map((_, j) => <FaStar key={j} />)}
              </div>
              <p className="italic text-gray-700">“{t.text}”</p>
              <p className="mt-3 font-semibold">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
