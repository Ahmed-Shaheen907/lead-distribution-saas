"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LeadLogsPage() {
  const companyId = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed";
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    agent: "",
    leadName: "",
    date: "",
  });

  // Fetch logs
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
        agents:agent_id (
          id,
          name
        )
      `
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (!error) setLogs(data);
  };

  useEffect(() => {
    loadLogs();

    // Subscribe to INSERT events
    const channel = supabase
      .channel("lead_logs_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_logs" },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtering logic
  const filteredLogs = logs.filter((log) => {
    const leadNameMatch = filters.leadName
      ? log.lead_json?.name
          ?.toLowerCase()
          .includes(filters.leadName.toLowerCase())
      : true;

    const agentMatch = filters.agent
      ? log.agents?.name === filters.agent
      : true;

    const dateMatch = filters.date
      ? log.created_at.startsWith(filters.date)
      : true;

    return leadNameMatch && agentMatch && dateMatch;
  });

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Lead Logs</h1>

      {/* FILTERS */}
      <div className="flex gap-4 mb-6">
        {/* Filter by Agent */}
        <select
          className="p-2 bg-gray-800 border border-gray-600 rounded"
          onChange={(e) => setFilters({ ...filters, agent: e.target.value })}
        >
          <option value="">All Agents</option>
          {[...new Set(logs.map((l) => l.agents?.name))].map(
            (agent, idx) =>
              agent && (
                <option key={idx} value={agent}>
                  {agent}
                </option>
              )
          )}
        </select>

        {/* Filter by lead name */}
        <input
          type="text"
          placeholder="Search Lead Name"
          className="p-2 bg-gray-800 border border-gray-600 rounded"
          onChange={(e) => setFilters({ ...filters, leadName: e.target.value })}
        />

        {/* Filter by date */}
        <input
          type="date"
          className="p-2 bg-gray-800 border border-gray-600 rounded"
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
      </div>

      {filteredLogs.length === 0 && <div>No leads found for this filter.</div>}

      {/* Cards */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="border border-gray-700 rounded-lg p-4 bg-[#050f24]"
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
