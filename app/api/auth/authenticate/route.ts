import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, mobile } = body || {};

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedMobile = typeof mobile === "string" ? mobile.trim() : "";

    // 1. Validate Name
    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Please tell Pando your name (at least 2 characters)." },
        { status: 400 },
      );
    }

    // 2. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { ok: false, error: "That email doesn't look right. Please check it and try again." },
        { status: 400 },
      );
    }

    // 3. Validate Mobile Number
    // Reject any alphabetic text (e.g., "abc", "hello", "123abc")
    if (/[a-zA-Z]/.test(trimmedMobile)) {
      return NextResponse.json(
        { ok: false, error: "That mobile number doesn't look valid. Please enter a valid mobile number including the country code (e.g. +971 50 123 4567)." },
        { status: 400 },
      );
    }

    // Strip spaces, dashes, parentheses for digit check
    const digitsOnly = trimmedMobile.replace(/[\s\-\(\)]/g, "");
    
    // Country code format check: must start with '+' or a valid non-zero digit, and contain 7 to 15 digits
    const mobileRegex = /^\+?[1-9]\d{6,14}$/;
    if (!digitsOnly || !mobileRegex.test(digitsOnly)) {
      return NextResponse.json(
        { ok: false, error: "That mobile number doesn't look valid. Please enter a valid mobile number including the country code (e.g. +971 50 123 4567)." },
        { status: 400 },
      );
    }

    // Extract first name for friendly display
    const firstName = trimmedName.split(" ")[0];
    const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    // Return authenticated user payload
    return NextResponse.json({
      ok: true,
      user: {
        name: displayName,
        fullName: trimmedName,
        email: trimmedEmail,
        mobile: digitsOnly,
      },
    });
  } catch (_err) {
    return NextResponse.json(
      { ok: false, error: "I couldn't complete that right now. Please try again." },
      { status: 500 },
    );
  }
}
