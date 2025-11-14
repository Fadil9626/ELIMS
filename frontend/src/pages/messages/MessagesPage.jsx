// frontend/src/pages/messages/MessagesPage.jsx
import React, { useEffect, useState } from "react";
import { HiMegaphone, HiPaperAirplane, HiUser } from "react-icons/hi2";
import { useSocket } from "../../context/SocketContext";
import notificationService from "../../services/notificationService";
import userService from "../../services/userService";
import { useAuth } from "../../context/AuthContext";

const MessagesPage = () => {
  const { user } = useAuth();

  // --- FIX: prevent destructure crash ---
  const { socket } = useSocket() || {};

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [receiver, setReceiver] = useState("");
  const [messageText, setMessageText] = useState("");
  const [activeChat, setActiveChat] = useState("broadcast");
  const [searchTerm, setSearchTerm] = useState("");

  const loadUsers = async () => {
    try {
      const list = await userService.getAllUsers();
      setUsers(list.filter((u) => u.id !== user?.id));
    } catch (e) {
      console.error("User load error:", e.message);
    }
  };

  const loadMessages = async () => {
    try {
      const list = await notificationService.getMessageHistory();
      setMessages(list || []);
    } catch (e) {
      console.error("Message load error:", e.message);
    }
  };

  // Live updates from socket
  useEffect(() => {
    if (!socket) return;
    console.log("📡 Socket Connected:", socket.id);

    socket.on("new_message", () => loadMessages());

    return () => socket.off("new_message");
  }, [socket]);

  useEffect(() => {
    loadUsers();
    loadMessages();
  }, []);

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    await notificationService.sendMessage({
      receiver_id: receiver === "broadcast" ? null : receiver,
      content: messageText.trim(),
      is_general: receiver === "broadcast",
    });

    setMessageText("");
    loadMessages();
  };

  const shownMessages = messages.filter((m) =>
    activeChat === "broadcast"
      ? m.is_general
      : m.sender_id === Number(activeChat) || m.receiver_id === Number(activeChat)
  );

  const filteredSidebar = messages
    .filter((msg) => (msg.sender_name || "").toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="flex h-[calc(100vh-95px)] border rounded-xl overflow-hidden bg-gray-50">

      {/* SIDEBAR */}
      <aside className="w-80 bg-white border-r p-3 flex flex-col">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-3">💬 Messages</h2>

        <input
          className="px-3 py-2 rounded-md border focus:ring focus:ring-blue-300"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Broadcast */}
        <button
          className={`mt-4 p-3 flex items-center gap-2 rounded-lg text-sm ${
            activeChat === "broadcast" ? "bg-blue-100 font-semibold" : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveChat("broadcast")}
        >
          <HiMegaphone className="text-pink-500" /> Broadcast Messages
        </button>

        {/* Recent Chats */}
        <div className="mt-2 overflow-y-auto space-y-1">
          {filteredSidebar
            .filter((m) => !m.is_general)
            .map((msg) => {
              const isActive = activeChat === msg.sender_id || activeChat === msg.receiver_id;
              return (
                <button
                  key={msg.id}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-2 ${
                    isActive ? "bg-blue-100 font-semibold" : "hover:bg-gray-100"
                  }`}
                  onClick={() =>
                    setActiveChat(msg.sender_id === user.id ? msg.receiver_id : msg.sender_id)
                  }
                >
                  <HiUser className="text-gray-500" />
                  <div>
                    <div className="font-medium text-sm">{msg.sender_name}</div>
                    <div className="text-xs text-gray-500 truncate">{msg.content}</div>
                  </div>
                </button>
              );
            })}
        </div>
      </aside>

      {/* CHAT WINDOW */}
      <main className="flex flex-col flex-grow bg-gray-50">

        {/* Header */}
        <header className="px-5 py-4 border-b bg-white text-lg font-semibold">
          {activeChat === "broadcast"
            ? "📢 Broadcast"
            : users.find((u) => u.id === Number(activeChat))?.full_name || "Chat"}
        </header>

        {/* MESSAGES */}
        <div className="flex flex-col gap-3 p-5 overflow-y-auto">
          {shownMessages.map((msg) => {
            const isMine = msg.sender_id === user.id;
            const isBroadcast = msg.is_general;

            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[65%] px-4 py-2 rounded-xl shadow-md relative text-[0.9rem] ${
                    isBroadcast
                      ? "bg-pink-600 text-white mx-auto"
                      : isMine
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-white"
                  }`}
                  title={new Date(msg.created_at).toLocaleString()}
                >
                  {msg.content}

                  {/* timestamp bottom right */}
                  <span className="block text-[10px] text-gray-200 opacity-70 mt-1 text-right">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* INPUT */}
        <footer className="p-4 bg-white border-t flex items-center gap-2">
          <select
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Select Recipient</option>
            <option value="broadcast">📢 Broadcast to All</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>

          <input
            className="flex-grow border rounded-lg px-4 py-2"
            placeholder="Write a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <HiPaperAirplane /> Send
          </button>
        </footer>
      </main>
    </div>
  );
};

export default MessagesPage;
