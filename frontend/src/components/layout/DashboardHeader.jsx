// frontend/src/components/layout/DashboardHeader.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  HiOutlineBell,
  HiOutlineUserCircle,
  HiOutlineLogout,
} from "react-icons/hi";
import { HiPaperAirplane } from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import GlobalSearch from "../dashboard/GlobalSearch";
import notificationService from "../../services/notificationService";
import SendMessageModal from "../messages/SendMessageModal";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const DashboardHeader = ({ userName, userImageUrl }) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  const { user, logout, socket } = useAuth();
  const navigate = useNavigate();

  const userDropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const displayName = user?.full_name || userName || "User";
  const greeting = getGreeting();

  // 🧠 Load unread count initially + poll
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        setUnreadCount(Number(res?.count || 0));
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // 🔔 Listen for real-time incoming messages
  useEffect(() => {
    if (!socket) return;

    const handler = (msg) => {
      // Only add if message is meant for THIS user OR broadcast
      if (msg.is_general || msg.receiver_id === user?.id) {
        setUnreadCount((prev) => prev + 1);
        setMessages((prev) => [msg, ...prev]);
      }
    };

    socket.on("new_message", handler);
    return () => socket.off("new_message", handler);
  }, [socket, user?.id]);

  // 📨 Toggle panel + load history + mark read
  const handleToggleNotifications = async () => {
    const open = !isNotificationOpen;
    setIsNotificationOpen(open);

    if (!open) return;

    setLoadingNotifications(true);
    try {
      const history = await notificationService.getMessageHistory();
      setMessages(history || []);
      await notificationService.markMessagesAsRead(); // update backend
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleLogout = () => {
    setIsUserDropdownOpen(false);
    logout();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target)
      )
        setIsUserDropdownOpen(false);

      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target)
      )
        setIsNotificationOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        {/* LEFT GREETING */}
        <div>
          <p className="text-xs text-gray-500">
            {greeting},{" "}
            <span className="font-semibold text-gray-700">{displayName}</span> 👋
          </p>
          <p className="text-sm text-gray-400">{user?.role_name || "User"}</p>
        </div>

        {/* SEARCH */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <GlobalSearch />
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-4">

          {/* SEND MESSAGE BUTTON */}
          <button
            className="p-2 hover:bg-gray-100 rounded-full"
            onClick={() => setSendModalOpen(true)}
            title="Send message"
          >
            <HiPaperAirplane className="w-6 h-6 text-blue-600" />
          </button>

          {/* NOTIFICATION BELL */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={handleToggleNotifications}
              className="relative p-2 hover:bg-gray-100 rounded-full"
            >
              <HiOutlineBell className="w-6 h-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* DROPDOWN */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-md border">
                <div className="px-3 py-2 border-b flex justify-between">
                  <span className="font-semibold text-sm">Messages</span>
                  {loadingNotifications && (
                    <span className="text-xs text-gray-400">Loading...</span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-500">
                      No messages yet.
                    </p>
                  ) : (
                    messages.slice(0, 8).map((m) => (
                      <div
                        key={m.id}
                        className="px-4 py-2 text-sm border-b hover:bg-gray-50"
                      >
                        <p className="font-semibold">
                          {m.is_general ? "📢 Broadcast" : m.sender_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-700 truncate">
                          {m.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* USER DROPDOWN */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setIsUserDropdownOpen((p) => !p)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <HiOutlineUserCircle className="w-8 h-8 text-gray-600" />
            </button>

            {isUserDropdownOpen && (
              <div className="absolute right-0 w-48 bg-white border rounded-md shadow-md py-2 mt-2">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                >
                  My Profile
                </Link>
                <hr />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  <HiOutlineLogout className="inline w-4 mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SEND MESSAGE MODAL */}
      <SendMessageModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
      />
    </>
  );
};

export default DashboardHeader;
