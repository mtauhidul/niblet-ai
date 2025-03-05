import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/onboarding",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirecting to:", url);
      return url.startsWith("/") ? `${baseUrl}${url}` : baseUrl;
    },
  },
});

export { handler as GET, handler as POST };
