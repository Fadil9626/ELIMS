import React, { useState, useEffect } from "react";
import userService from "../../services/userService";
import notificationService from "../../services/notificationService";
import { toast } from "react-hot-toast";
import { XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const SendMessageModal = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [content, setContent] = useState("");
  const [isGeneral, setIsGeneral] = useState(false);
  const [loading, setLoading] = useState(false);

  const { token, can } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    // Fetch users only when modal opens
    const loadUsers = async () => {
      try {
        const response = await userService.getAllUsers(token);
        setUsers(response);
      } catch {
        toast.error("Failed to load users");
      }
    };

    loadUsers();
  }, [isOpen, token]);

  const handleSend = async () => {
    if (!content.trim()) return toast.error("Message cannot be empty");

    if (!isGeneral && !receiverId)
      return toast.error("Select a user to message");

    setLoading(true);
    try {
      await notificationService.sendMessage({
        content,
        receiver_id: isGeneral ? null : receiverId,
        is_general: isGeneral,
      }, token);

      toast.success("Message sent!");
      setContent("");
      setReceiverId("");
      setIsGeneral(false);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  if (!can("Messages", "Create")) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-lg fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Send Message</h2>
          <button onClick={onClose}>
            <XCircle size={22} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>

        {/* Broadcast Toggle */}
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={isGeneral}
            onChange={() => setIsGeneral(!isGeneral)}
          />
          <span className="text-sm">Send as Broadcast to ALL users</span>
        </label>

        {/* User Select (hidden if broadcast) */}
        {!isGeneral && (
          <select
            className="w-full border px-3 py-2 rounded-lg mb-4"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
          >
            <option value="">Select User</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        )}

        {/* Message Textarea */}
        <textarea
          rows="4"
          placeholder="Type your message..."
          value={content}
          className="w-full border px-3 py-2 rounded-lg"
          onChange={(e) => setContent(e.target.value)}
        ></textarea>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-black"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleSend}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendMessageModal;
