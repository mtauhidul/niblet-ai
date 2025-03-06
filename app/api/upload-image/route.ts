// app/api/upload-image/route.ts
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Import the app instance directly
import { app } from "@/lib/firebase/clientApp";

// Initialize Firebase Storage using the imported app instance
const storage = getStorage(app);

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json(
        { message: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "File must be less than 5MB" },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer
    const fileBuffer = await imageFile.arrayBuffer();

    // Generate a unique filename using UUID instead of timestamp
    const uniqueId = uuidv4();
    const fileExtension = imageFile.name.split(".").pop();
    const fileName = `users/${token.sub}/images/${uniqueId}.${
      fileExtension || "jpg"
    }`;

    // Create storage reference
    const storageRef = ref(storage, fileName);

    // Upload file to Firebase Storage
    await uploadBytes(storageRef, new Uint8Array(fileBuffer), {
      contentType: imageFile.type,
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Return success response
    return NextResponse.json({
      message: "Image uploaded successfully",
      imageUrl: downloadURL,
    });
  } catch (error) {
    console.error("Error processing image upload:", error);
    return NextResponse.json(
      {
        message: "An error occurred during image upload",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
