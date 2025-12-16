"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Trash2, GripVertical } from "lucide-react";

export default function AgentsClient({ user }) {
  const companyId = user?.company_id;

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newChatId, setNewChatId] = useState("");

  // Load agents
  useEffect(() => {
    if (!companyId) return;
    loadAgents();
  }, [companyId]);

  const loadAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("company_id", companyId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setAgents(data || []);
    setLoading(false);
  };

  const addAgent = async () => {
    if (!newName.trim() || !newChatId.trim()) {
      alert("Enter both name + telegram chat ID");
      return;
    }

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name: newName,
        telegram_chat_id: newChatId,
        company_id: companyId,
        order_index: agents.length,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Failed to add");
      return;
    }

    setAgents((prev) => [...prev, data]);

    setNewName("");
    setNewChatId("");
  };

  const deleteAgent = async (id) => {
    if (!confirm("Delete this agent?")) return;

    const { error } = await supabase.from("agents").delete().eq("id", id);

    if (error) {
      alert("Delete failed");
      console.error(error);
      return;
    }

    loadAgents();
  };

  // Handle drag & drop reorder
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reordered = Array.from(agents);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Update order indices
    const updated = reordered.map((a, i) => ({
      ...a,
      order_index: i,
    }));

    setAgents(updated);

    // Save to supabase
    const updates = updated.map((a) => ({
      id: a.id,
      company_id: companyId,
      name: a.name,
      telegram_chat_id: a.telegram_chat_id,
      order_index: a.order_index,
    }));

    const { error } = await supabase.from("agents").upsert(updates);

    if (error) {
      console.error(error);
      alert("Failed to save order");
      loadAgents();
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Agents</h1>

      {/* Add agent form */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6 max-w-md">
        <h2 className="text-xl mb-3 font-semibold">Add Agent</h2>

        <input
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-2"
          placeholder="Agent name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <input
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 mb-3"
          placeholder="Telegram chat ID"
          value={newChatId}
          onChange={(e) => setNewChatId(e.target.value)}
        />

        <button
          onClick={addAgent}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Add Agent
        </button>
      </div>

      {/* Agents List */}
      <h2 className="text-xl font-semibold mb-3">Current Agents</h2>

      {loading ? (
        <p>Loading…</p>
      ) : agents.length === 0 ? (
        <p className="text-gray-400">No agents yet.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="agents">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3 max-w-xl"
              >
                {agents.map((agent, index) => (
                  <Draggable
                    key={agent.id}
                    draggableId={agent.id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded p-3"
                      >
                        <div {...provided.dragHandleProps}>
                          <GripVertical className="text-gray-400 mr-3" />
                        </div>

                        <div className="flex-1">
                          <p className="font-semibold">{agent.name}</p>
                          <p className="text-gray-400 text-sm">
                            ID: {agent.telegram_chat_id}
                          </p>
                        </div>

                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
