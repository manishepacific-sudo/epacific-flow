import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";
import { limiter } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // Rate Limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!limiter.check(ip)) {
    return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, subject, message, honeypot } = body;

    // Honeypot check
    if (honeypot) {
      // Return success to confuse bots, or 400
      return NextResponse.json({ message: "Message sent" });
    }

    // Validation
    if (!name || !email || !phone || !subject || !message) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Basic sanitization (escaping html tags to prevent injection in email client if it renders html)
    const sanitize = (str: string) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Email validation
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    // Send email
    const htmlContent = `
      <h3>New Contact Request from Website</h3>
      <p><strong>Name:</strong> ${sanitize(name)}</p>
      <p><strong>Email:</strong> ${sanitize(email)}</p>
      <p><strong>Phone:</strong> ${sanitize(phone)}</p>
      <p><strong>Subject:</strong> ${sanitize(subject)}</p>
      <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #1e40af;">
        <p><strong>Message:</strong></p>
        <p>${sanitize(message).replace(/\n/g, "<br>")}</p>
      </div>
    `;

    await sendEmail(
      process.env.CONTACT_RECEIVER_EMAIL || "admin@example.com",
      `New Contact: ${sanitize(subject)}`,
      htmlContent
    );

    return NextResponse.json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Contact API Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
