"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RoutingRulesPage() {
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(true);

  const companyId = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed";

  // Load rule from Supabase
  const loadRule = async () => {
    const { data, error } = await supabase
      .from("routing_rules")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (data) {
      setBotToken(data.telegram_bot_token || "");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRule();
  }, []);

  // Save or update rule
  const saveRule = async () => {
    setLoading(true);

    const { error } = await supabase.from("routing_rules").upsert(
      {
        company_id: companyId,
        telegram_bot_token: botToken,
        round_robin_enabled: true,
      },
      { onConflict: "company_id" }
    );

    setLoading(false);

    if (!error) alert("Saved!");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Routing Rules</h1>

      <div className="bg-white p-6 rounded-lg shadow w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">
          Telegram Bot Configuration
        </h2>

        <label className="block mb-2 font-medium">Bot Token</label>
        <input
          type="text"
          className="w-full border p-2 rounded mb-3"
          placeholder="Enter your Telegram bot token"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
        />

        <button
          onClick={saveRule}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
