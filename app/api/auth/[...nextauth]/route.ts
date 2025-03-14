// app/api/auth/[...nextauth]/route.ts
import { emailExists } from "@/lib/auth/authService";
import NextAuth from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

// Extend the Session type to include isNewUser
declare module "next-auth" {
  interface Session {
    isNewUser?: boolean;
    user: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error", // This is key to make sure errors are handled properly
    newUser: "/onboarding", // Only for new users
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Only perform this check for OAuth sign-ins
        if (account?.provider && user.email) {
          // Check if this email already exists
          const userExists = await emailExists(user.email);

          if (userExists) {
            // This email already exists in our system
            return `/auth/error?error=EmailAlreadyExists`;
          }
        }

        // Allow sign in
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return `/auth/error?error=SignInError`;
      }
    },
    async jwt({ token, account, user, profile, isNewUser }) {
      // Initial sign in
      if (account && user) {
        token.id = user.id;
        token.provider = account.provider;
        // Add an isNewUser flag to the token
        token.isNewUser = isNewUser;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        // Add isNewUser to the session as well
        session.isNewUser = token.isNewUser as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Important: Fix the redirect logic for error cases

      // If url contains an error, make sure we handle it properly
      if (url.includes("/auth/error")) {
        return url; // Keep the error URL as is
      }

      // Check if this is a new user going to onboarding
      if (url.includes("isNewUser=true")) {
        return `${baseUrl}/onboarding`;
      }

      // If the URL starts with baseUrl or is a relative URL, allow it
      if (url.startsWith(baseUrl) || url.startsWith("/")) {
        return url;
      }

      // Default redirect to dashboard
      return `${baseUrl}/dashboard`;
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
