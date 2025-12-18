"use client";
import { useState } from "react";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  const handleSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/paymob/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // CHECK IF THE RESPONSE IS ACTUALLY JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error(
          "❌ Expected JSON but got HTML. Server might be redirecting or crashing:",
          text
        );
        alert("Server error: Received HTML instead of JSON. Check console.");
        return;
      }

      const data = await res.json();

      if (data.paymentToken) {
        const iframeId = "931386";
        window.location.href = `https://egypt.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${data.paymentToken}`;
      } else {
        alert(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("🔥 Fetch Error:", error);
      alert("Check your network connection or server logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-white bg-black">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-2 text-center">Activate Pro</h1>
        <p className="text-gray-400 mb-6 text-center">
          Unlock your dashboard and agents.
        </p>
        <div className="text-4xl font-bold mb-6 text-center text-blue-500">
          500 EGP <span className="text-lg font-normal text-gray-500">/mo</span>
        </div>
        <button
          onClick={handleSubscription}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? "Connecting to Paymob..." : "Subscribe & Pay"}
        </button>
      </div>
    </div>
  );
}
