"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "Home", href: "#hero" },
  { name: "Services", href: "#services" },
  { name: "About", href: "#about" },
  { name: "Location", href: "#location" },
  { name: "Contact", href: "#contact" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);

      // Scroll spy logic
      const sections = NAV_LINKS.map((link) => link.href.substring(1));
      let current = "";
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && window.scrollY >= (element.offsetTop - 100)) {
          current = section;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // Header height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg py-2" : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="relative h-12 w-40" onClick={(e) => handleNavClick(e, "#hero")}>
           <Image
            src="/epacific-logo.png"
            alt="Epacific Technologies"
            fill
            className="object-contain object-left"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={cn(
                "text-sm font-semibold tracking-wide transition-colors duration-300 relative group",
                activeSection === link.href.substring(1)
                  ? "text-primary"
                  : isScrolled ? "text-dark hover:text-primary" : "text-dark hover:text-primary" // Assuming header over light bg or white when scrolled
              )}
            >
              {link.name}
              <span className={cn(
                  "absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full",
                   activeSection === link.href.substring(1) ? "w-full" : ""
              )} />
            </a>
          ))}
          <a
             href="#contact"
             onClick={(e) => handleNavClick(e, "#contact")}
             className="px-6 py-3 bg-primary text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-colors duration-300 flex items-center space-x-2"
          >
             <Phone size={18} />
             <span>Get in Touch</span>
          </a>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2 text-dark"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "lg:hidden fixed inset-x-0 top-[60px] bg-white shadow-xl transition-all duration-300 ease-in-out overflow-hidden",
          isMobileMenuOpen ? "max-h-screen py-6" : "max-h-0 py-0"
        )}
      >
        <div className="flex flex-col space-y-4 px-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={cn(
                "text-lg font-medium border-b border-gray-100 pb-2",
                activeSection === link.href.substring(1) ? "text-primary border-primary" : "text-dark"
              )}
            >
              {link.name}
            </a>
          ))}
           <a
             href="#contact"
             onClick={(e) => handleNavClick(e, "#contact")}
             className="w-full text-center px-6 py-3 bg-primary text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-colors duration-300 mt-4"
          >
             Contact Us
          </a>
        </div>
      </div>
    </header>
  );
}
