"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LeadLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [agentFilter, setAgentFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const companyId = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed";

  // Load logs initially
  const loadLogs = async () => {
    const { data, error } = await supabase
      .from("lead_logs")
      .select(
        `
        id,
        created_at,
        status,
        lead_json,
        agent_id,
        agents:agent_id ( id, name )
      `
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (!error) setLogs(data);
    setLoading(false);
  };

  // 🔥 REALTIME LISTENER (INSERT + UPDATE)
  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel("lead_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_logs",
        },
        async (payload) => {
          console.log("🔥 REALTIME EVENT:", payload);

          // INSERT → fetch agent name manually
          if (payload.eventType === "INSERT") {
            const newLog = payload.new;

            const { data: agentData } = await supabase
              .from("agents")
              .select("id, name")
              .eq("id", newLog.agent_id)
              .single();

            const enriched = {
              ...newLog,
              agents: agentData ? { name: agentData.name } : null,
            };

            setLogs((prev) => [enriched, ...prev]);
          }

          // UPDATE → fetch agent name manually
          if (payload.eventType === "UPDATE") {
            const updated = payload.new;

            const { data: agentData } = await supabase
              .from("agents")
              .select("id, name")
              .eq("id", updated.agent_id)
              .single();

            const enrichedUpdate = {
              ...updated,
              agents: agentData ? { name: agentData.name } : null,
            };

            setLogs((prev) =>
              prev.map((log) =>
                log.id === enrichedUpdate.id ? enrichedUpdate : log
              )
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Apply filters
  const filteredLogs = logs.filter((log) => {
    const matchesAgent =
      agentFilter === "" ||
      log.agents?.name?.toLowerCase().includes(agentFilter.toLowerCase());

    const matchesName =
      nameFilter === "" ||
      log.lead_json?.name?.toLowerCase().includes(nameFilter.toLowerCase());

    const matchesDate =
      dateFilter === "" || log.created_at.startsWith(dateFilter);

    return matchesAgent && matchesName && matchesDate;
  });

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Lead Logs</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          className="p-2 rounded bg-gray-800"
          placeholder="Filter by agent name"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
        />

        <input
          className="p-2 rounded bg-gray-800"
          placeholder="Filter by lead name"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />

        <input
          type="date"
          className="p-2 rounded bg-gray-800"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      {/* Lead Cards */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="border border-gray-700 rounded-lg p-4 bg-gray-900"
          >
            <p>
              <strong>Name:</strong> {log.lead_json?.name}
            </p>
            <p>
              <strong>Phone:</strong> {log.lead_json?.phone}
            </p>
            <p>
              <strong>Job:</strong> {log.lead_json?.job}
            </p>
            <p>
              <strong>Description:</strong> {log.lead_json?.description}
            </p>
            <p>
              <strong>Sent To:</strong> {log.agents?.name || "Unknown"}
            </p>
            <p>
              <strong>Status:</strong> {log.status}
            </p>
            <p>
              <strong>Date:</strong> {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
