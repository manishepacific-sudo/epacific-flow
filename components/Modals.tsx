"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ContactForm from "./ContactForm";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative animate-scale-in max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold font-heading text-dark">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function SuccessModal({ isOpen, onClose, message }: SuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Success">
      <div className="flex flex-col items-center text-center space-y-4">
        <CheckCircle size={64} className="text-accent" />
        <p className="text-lg text-gray-600">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

export function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Contact Us">
        <ContactForm onSuccess={() => {
            onClose();
            setShowSuccess(true);
        }} />
      </Modal>
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        message="Message sent successfully! We will be in touch soon."
      />
    </>
  );
}
