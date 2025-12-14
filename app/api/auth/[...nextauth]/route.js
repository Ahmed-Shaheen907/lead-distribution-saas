import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export const authOptions = {
    session: { strategy: "jwt" },

    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },

            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // 🔹 Get user from *public.users* (NOT auth.users)
                const { data: dbUser, error } = await supabaseAdmin
                    .from("users")
                    .select("*")
                    .eq("email", credentials.email)
                    .single();

                if (error || !dbUser) {
                    console.error("No user row found or DB error", error);
                    return null;
                }

                // 🔹 Compare password with password_hash column
                const passwordMatch = await bcrypt.compare(
                    credentials.password,
                    dbUser.password_hash
                );

                if (!passwordMatch) {
                    console.error("Password mismatch");
                    return null;
                }

                // What NextAuth stores in the JWT
                return {
                    id: dbUser.id,
                    email: dbUser.email,
                    company_id: dbUser.company_id,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.company_id = user.company_id;
            }
            return token;
        },

        async session({ session, token }) {
            // make sure session.user exists
            session.user = session.user || {};
            session.user.id = token.sub;
            session.user.company_id = token.company_id;
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
