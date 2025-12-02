"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Trash2 } from "lucide-react";

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [name, setName] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const companyId = "c1fd70c2-bb2e-46fa-bd12-bfe48fb88eed"; // Temporary until auth is added

  // Fetch agents
  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("company_id", companyId)
      .order("order_index", { ascending: true });

    if (!error) setAgents(data);
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Add agent
  const addAgent = async () => {
    if (!name || !telegramChatId) return;

    await supabase.from("agents").insert([
      {
        name,
        telegram_chat_id: telegramChatId,
        company_id: companyId,
        order_index: agents.length,
      },
    ]);

    setName("");
    setTelegramChatId("");
    fetchAgents();
  };

  // Delete agent
  const deleteAgent = async (id) => {
    await supabase.from("agents").delete().eq("id", id);
    fetchAgents();
  };

  // Handle drag & drop reorder
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const newAgents = Array.from(agents);
    const [moved] = newAgents.splice(result.source.index, 1);
    newAgents.splice(result.destination.index, 0, moved);

    // Update UI instantly
    setAgents(newAgents);

    // Persist new order to Supabase
    for (let i = 0; i < newAgents.length; i++) {
      await supabase
        .from("agents")
        .update({ order_index: i })
        .eq("id", newAgents[i].id);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Agents</h1>

      {/* Add Agent Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Add Agent</h2>

        <input
          type="text"
          className="w-full border p-2 rounded mb-3"
          placeholder="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          className="w-full border p-2 rounded mb-3"
          placeholder="Telegram Chat ID"
          value={telegramChatId}
          onChange={(e) => setTelegramChatId(e.target.value)}
        />

        <button
          onClick={addAgent}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Add Agent
        </button>
      </div>

      {/* Agent List */}
      <div className="bg-white p-6 rounded-lg shadow w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Agent List</h2>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="agents">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
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
                        {...provided.dragHandleProps}
                        className="flex justify-between items-center p-3 border rounded mb-2 bg-gray-50 hover:bg-gray-100"
                      >
                        <div>
                          <div className="font-semibold">{agent.name}</div>
                          <div className="text-sm text-gray-500">
                            Chat ID: {agent.telegram_chat_id}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={20} />
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
      </div>
    </div>
  );
}
