import { NextResponse } from "next/server";
import { validateEmail, validateFullPhone, validateName } from "@/lib/authValidation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, mobile } = body || {};

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedMobile = typeof mobile === "string" ? mobile.trim() : "";

    // The same rules the form and Pando's voice flow apply, so no entry path is the lenient one.
    const error =
      validateName(trimmedName) ?? validateEmail(trimmedEmail) ?? validateFullPhone(trimmedMobile);
    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    // Extract first name for friendly display
    const firstName = trimmedName.split(" ")[0];
    const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    return NextResponse.json({
      ok: true,
      user: {
        name: displayName,
        fullName: trimmedName,
        email: trimmedEmail,
        mobile: trimmedMobile.replace(/[\s\-().]/g, ""),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "I couldn't complete that right now. Please try again." },
      { status: 500 },
    );
  }
}
