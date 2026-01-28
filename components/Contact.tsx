"use client";

import { useState } from "react";
import ContactForm from "./ContactForm";
import { SuccessModal } from "./Modals";

export default function Contact() {
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <section id="contact" className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl lg:text-4xl font-bold text-center text-dark mb-4 font-heading">
          Get in Touch
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Have a project in mind or want to learn more about our services? We'd love to hear from you.
        </p>

        <div className="bg-gray-50 p-8 rounded-xl shadow-lg border border-gray-100">
             <ContactForm onSuccess={() => setShowSuccess(true)} />
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        message="Thank you for contacting us! We will get back to you shortly."
      />
    </section>
  );
}
