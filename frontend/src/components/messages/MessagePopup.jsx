import React, { useEffect, useState } from "react";
import notificationService from "../../services/notificationService";
import { X } from "lucide-react";

export default function MessagePopup({ onClose }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    notificationService.getMessages().then(setMessages);
  }, []);

  return (
    <div className="absolute top-16 right-4 w-80 bg-white shadow-xl rounded-lg border z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-800">Messages</h3>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-gray-500 hover:text-black" />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No messages yet</p>
        ) : messages.map((m) => (
          <div key={m.id} className="bg-gray-100 rounded-lg p-2 text-sm">
            <strong>{m.sender_name || "Broadcast"}:</strong>
            <p>{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
