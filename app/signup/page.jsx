"use client";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");

  async function submit() {
    await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        company_name: company,
      }),
    });
    alert("Account created! Please login.");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Company Account</h1>
      <input
        placeholder="Company name"
        onChange={(e) => setCompany(e.target.value)}
      />
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={submit}>Sign up</button>
    </div>
  );
}
