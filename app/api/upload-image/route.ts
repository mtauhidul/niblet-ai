// app/api/upload-image/route.ts
import { app } from "@/lib/firebase/clientApp";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Initialize Firebase Storage
const storage = getStorage(app);

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the form data from the request
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

    // Convert File to Blob and then to ArrayBuffer
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique filename with user ID to prevent collisions
    const timestamp = Date.now();
    const fileName = `user_${
      token.sub
    }/images/${timestamp}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Create a storage reference
    const storageRef = ref(storage, fileName);

    // Upload the file to Firebase Storage
    const uploadTask = uploadBytesResumable(storageRef, buffer, {
      contentType: imageFile.type,
    });

    // Handle the upload as a Promise
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Optional: Handle upload progress
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error("Upload failed:", error);
          resolve(
            NextResponse.json({ message: "Upload failed" }, { status: 500 })
          );
        },
        async () => {
          // Handle successful upload
          try {
            // Get the download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Return success response with the image URL
            resolve(
              NextResponse.json({
                message: "Image uploaded successfully",
                imageUrl: downloadURL,
              })
            );
          } catch (error) {
            console.error("Error getting download URL:", error);
            resolve(
              NextResponse.json({ message: "Upload failed" }, { status: 500 })
            );
          }
        }
      );
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
