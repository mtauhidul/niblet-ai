import NextAuth from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

// Extend the Session type to include isNewUser
declare module "next-auth" {
  interface Session {
    isNewUser?: boolean;
  }
}

// In app/api/auth/[...nextauth]/route.ts

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
    error: "/auth/error",
    newUser: "/onboarding", // This is already correct
  },
  callbacks: {
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
      // Check if this is a new user
      if (
        url.startsWith(`${baseUrl}/auth/signin`) &&
        (url.includes("?isNewUser=true") || url.includes("&isNewUser=true"))
      ) {
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
