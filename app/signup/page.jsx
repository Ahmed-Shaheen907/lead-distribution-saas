"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // 👈 NEW
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: company,
        email,
        password,
      }),
    });

    if (!res.ok) {
      setError("Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-black mb-2">
          Create Company Account
        </h1>
        <p className="text-gray-500 mb-6">Start using The Gemini Lab</p>

        <form onSubmit={submit} className="space-y-4">
          <input
            required
            disabled={loading}
            placeholder="Company name"
            className="w-full p-3 rounded-lg border border-gray-300
                       focus:ring-2 focus:ring-blue-500 text-black"
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setError("");
            }}
          />

          <input
            required
            type="email"
            disabled={loading}
            placeholder="you@company.com"
            className="w-full p-3 rounded-lg border border-gray-300
                       focus:ring-2 focus:ring-blue-500 text-black"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />

          <input
            required
            type="password"
            disabled={loading}
            placeholder="••••••••"
            className="w-full p-3 rounded-lg border border-gray-300
                       focus:ring-2 focus:ring-blue-500 text-black"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
          />

          {/* INLINE ERROR */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-lg font-medium transition
              ${
                loading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }
            `}
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
