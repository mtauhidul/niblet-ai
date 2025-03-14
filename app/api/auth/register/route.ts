// app/api/auth/register/route.ts
import { emailExists, registerUser } from "@/lib/auth/authService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if email already exists before creating user
    const emailAlreadyExists = await emailExists(email);
    if (emailAlreadyExists) {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 409 } // 409 Conflict is appropriate for duplicate resource
      );
    }

    // Create user
    const user = await registerUser({ name, email, password });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
