import supabase from "@/lib/supabaseClient";

export default async function LeadLogsPage() {
  const companyId = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed"; // (later: read from logged-in user)

  const { data: logs, error } = await supabase
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
      name,
      telegram_chat_id
    )
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return <div>Error loading logs</div>;
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Lead Logs</h1>

      {logs.length === 0 && <div>No leads found for this company.</div>}

      <div className="space-y-4">
        {logs.map((log) => (
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
