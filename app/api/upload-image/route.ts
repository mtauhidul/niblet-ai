import { app } from "@/lib/firebase/clientApp";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Initialize Firebase Storage
const storage = getStorage(app);

export async function POST(request: NextRequest) {
  try {
    console.log("Received upload request"); // Debugging

    // Verify user authentication
    const token = await getToken({ req: request });
    if (!token?.sub) {
      console.error("Unauthorized request");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    console.log("Form Data Received:", formData);

    const imageFile = formData.get("image") as File;
    if (!imageFile) {
      console.error("No image file provided");
      return NextResponse.json(
        { message: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith("image/")) {
      console.error("Invalid file type:", imageFile.type);
      return NextResponse.json(
        { message: "File must be an image" },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer
    const fileBuffer = await imageFile.arrayBuffer();

    // Generate a unique filename
    const timestamp = Date.now();
    const fileName = `user_${
      token.sub
    }/images/${timestamp}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    console.log("Uploading file to Firebase:", fileName);

    // Create storage reference
    const storageRef = ref(storage, fileName);

    // Upload file to Firebase Storage
    await uploadBytes(storageRef, fileBuffer, { contentType: imageFile.type });

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log("File uploaded successfully:", downloadURL);

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
