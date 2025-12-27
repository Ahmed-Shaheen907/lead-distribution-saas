import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

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

                // 1. Fetch user from Supabase
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

                // 3. Return user object 
                // CRITICAL: We return company_id here so the jwt callback can see it
                return {
                    id: user.id,
                    email: user.email,
                    company_id: user.company_id
                };
            },
        }),
    ],
    callbacks: {
        // STEP 1: Take the data from 'authorize' and put it into the encrypted JWT
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.company_id = user.company_id;
            }
            return token;
        },
        // STEP 2: Take the data from the JWT and make it available to the Frontend/API
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.company_id = token.company_id;
            }
            return session;
        }
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/login',
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };