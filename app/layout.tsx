import type { Metadata } from "next";
import { Poppins, Roboto } from "next/font/google";
import "../styles/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Epacific Technologies Pvt. Ltd.",
  description: "Modern scalable web applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${poppins.variable} ${roboto.variable} font-sans bg-gray text-dark`}>
        <Header />
        <main>
          {children}
        </main>
        <Footer />
        <BackToTop />
      </body>
    </html>
  );
}
