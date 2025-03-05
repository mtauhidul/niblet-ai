// app/api/weight/route.ts
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET weight logs
export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get weight logs
    const weightLogs = await prisma.weightLog.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(weightLogs);
  } catch (error) {
    console.error("Error fetching weight logs:", error);
    return NextResponse.json(
      { message: "Failed to fetch weight logs" },
      { status: 500 }
    );
  }
}

// POST weight log
export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get weight data from request body
    const { weight, date } = await request.json();

    // Validate weight
    if (!weight || isNaN(parseFloat(weight))) {
      return NextResponse.json(
        { message: "Valid weight is required" },
        { status: 400 }
      );
    }

    // Create weight log
    const weightLog = await prisma.weightLog.create({
      data: {
        userId: session.user.id,
        weight: parseFloat(weight),
        date: date ? new Date(date) : new Date(),
      },
    });

    // Update current weight in user profile
    await prisma.userProfile.update({
      where: {
        userId: session.user.id,
      },
      data: {
        currentWeight: parseFloat(weight),
      },
    });

    return NextResponse.json(weightLog, { status: 201 });
  } catch (error) {
    console.error("Error creating weight log:", error);
    return NextResponse.json(
      { message: "Failed to create weight log" },
      { status: 500 }
    );
  }
}
