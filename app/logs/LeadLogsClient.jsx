"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LeadLogsPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [agentFilter, setAgentFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const companyId = user?.company_id;

  // Fetch logs
  const loadLogs = async () => {
    setLoading(true);

    const { count } = await supabase
      .from("lead_logs")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);

    setTotalCount(count || 0);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("lead_logs")
      .select(
        `
        id,
        created_at,
        status,
        lead_json,
        agent_name
      `
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) setLogs(data);
    setLoading(false);
  };

  // Load and subscribe to changes
  useEffect(() => {
    if (!companyId) return;

    loadLogs();

    const channel = supabase
      .channel("lead_logs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_logs" },
        (payload) => {
          if (page !== 1) return;

          if (payload.eventType === "INSERT") {
            setLogs((prev) => [payload.new, ...prev.slice(0, PAGE_SIZE - 1)]);
          }

          if (payload.eventType === "UPDATE") {
            setLogs((prev) =>
              prev.map((log) => (log.id === payload.new.id ? payload.new : log))
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [page, companyId]);

  if (loading) return <div className="text-white p-6">Loading...</div>;

  const filteredLogs = logs.filter((log) => {
    const matchesAgent =
      agentFilter === "" ||
      log.agent_name?.toLowerCase().includes(agentFilter.toLowerCase());

    const matchesName =
      nameFilter === "" ||
      log.lead_json?.name?.toLowerCase().includes(nameFilter.toLowerCase());

    const matchesDate =
      dateFilter === "" || log.created_at.startsWith(dateFilter);

    return matchesAgent && matchesName && matchesDate;
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

      {/* Pagination */}
      <div className="mb-4 flex items-center gap-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 bg-gray-700 disabled:bg-gray-500 rounded"
        >
          Previous
        </button>

        <span>
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-3 py-1 bg-gray-700 disabled:bg-gray-500 rounded"
        >
          Next
        </button>
      </div>

      {/* Cards */}
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
              <strong>Sent To:</strong> {log.agent_name}
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
