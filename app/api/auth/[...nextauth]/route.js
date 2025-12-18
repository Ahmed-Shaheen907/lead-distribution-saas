import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { supabaseAdmin } from "@/lib/supabaseAdminClient"; // Reuse the admin client

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const { email, password } = credentials;

                // 1. Fetch user from YOUR public.users table
                const { data: user } = await supabaseAdmin
                    .from("users")
                    .select("*")
                    .eq("email", email)
                    .single();

                if (!user) {
                    throw new Error("No user found");
                }

                // 2. Verify Password
                const isValid = await compare(password, user.password_hash);
                if (!isValid) {
                    throw new Error("Invalid password");
                }

                // 3. Return user object (NextAuth saves this to the JWT)
                return {
                    id: user.id,
                    email: user.email,
                    company_id: user.company_id
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.company_id = user.company_id;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.company_id = token.company_id;
            return session;
        },
    },
    session: { strategy: "jwt" },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };