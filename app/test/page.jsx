"use client";

import { useState } from "react";

export default function TestPage() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const sendLead = async () => {
    setLoading(true);

    const res = await fetch("/api/incoming-lead", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Token": "123456",
      },
      body: JSON.stringify({
        name: "Muhanad Test Lead",
        phone: "0100000000",
        project: "Infinity",
      }),
    });

    const data = await res.json();
    setResponse(JSON.stringify(data, null, 2));
    setLoading(false);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Test Incoming Lead API</h1>

      <button
        onClick={sendLead}
        style={{
          background: "#0057ff",
          color: "white",
          padding: "10px 20px",
          borderRadius: "6px",
          marginBottom: "20px",
        }}
      >
        {loading ? "Sending..." : "Send Test Lead"}
      </button>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#eee",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        {response}
      </pre>
    </div>
  );
}
