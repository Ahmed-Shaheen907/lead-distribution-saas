"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabaseClient";

const PAGE_SIZE = 15;

export default function LeadLogsPage() {
  const { data: session, status } = useSession();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [agentFilter, setAgentFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const companyId = session?.user?.company_id;

  const loadLogs = async () => {
    if (!companyId) return;

    setLoading(true);

    const { count } = await supabase
      .from("lead_logs")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);

    setTotalCount(count || 0);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from("lead_logs")
      .select("id, created_at, status, lead_json, agent_name, company_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(from, to);

    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (status !== "authenticated" || !companyId) return;
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, companyId, page]);

  useEffect(() => {
    if (status !== "authenticated" || !companyId) return;

    const channel = supabase
      .channel("lead_logs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_logs" },
        (payload) => {
          if (payload.new?.company_id !== companyId) return;
          if (page !== 1) return;

          if (payload.eventType === "INSERT") {
            setLogs((prev) => [
              {
                id: payload.new.id,
                created_at: payload.new.created_at,
                status: payload.new.status,
                lead_json: payload.new.lead_json,
                agent_name: payload.new.agent_name,
                company_id: payload.new.company_id,
              },
              ...prev.slice(0, PAGE_SIZE - 1),
            ]);
          }

          if (payload.eventType === "UPDATE") {
            setLogs((prev) =>
              prev.map((log) =>
                log.id === payload.new.id
                  ? {
                      id: payload.new.id,
                      created_at: payload.new.created_at,
                      status: payload.new.status,
                      lead_json: payload.new.lead_json,
                      agent_name: payload.new.agent_name,
                      company_id: payload.new.company_id,
                    }
                  : log
              )
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, companyId, page]);

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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (status === "loading" || loading) {
    return <div className="text-white p-6">Loading…</div>;
  }

  if (status === "unauthenticated") {
    return <div className="text-white p-6">Not authenticated</div>;
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Lead Logs</h1>

      <div className="flex gap-4 mb-6">
        <input
          className="p-2 rounded bg-gray-800"
          placeholder="Filter by agent"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
        />

        <input
          className="p-2 rounded bg-gray-800"
          placeholder="Filter by name"
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

      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="border border-gray-700 rounded-lg p-4 bg-[#020617]"
          >
            <p>
              <strong>Name:</strong> {log.lead_json?.name}
            </p>
            <p>
              <strong>Phone:</strong> {log.lead_json?.phone}
            </p>
            <p>
              <strong>Job:</strong> {log.lead_json?.job_title}
            </p>
            <p>
              <strong>Description:</strong> {log.lead_json?.description}
            </p>
            <p>
              <strong>Sent To:</strong> {log.agent_name}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={
                  log.status === "sent" ? "text-green-400" : "text-yellow-400"
                }
              >
                {log.status}
              </span>
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
