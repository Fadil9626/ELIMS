// frontend/src/context/SocketContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // ⚠️ Note: For production use, relying solely on localStorage here is risky
  // It's generally safer to get the token directly from the useAuth hook 
  // if you have access to it, but this useMemo is acceptable if the AuthContext
  // is not directly accessible here (which it should be).
  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("elims_auth_v1") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const token = userInfo?.token;
    
    // 🛑 CRITICAL FIX ALREADY PRESENT: Prevents WebSocket error when unauthenticated
    if (!token) {
        if (socket) {
            socket.disconnect(); // Disconnect existing socket if token is removed
            setSocket(null);
        }
        return;
    };

    const serverURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const s = io(serverURL, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ["websocket"],
    });

    s.on("connect", () => {
      console.log("🔗 Socket connected:", s.id);
      setConnected(true);
    });

    s.on("disconnect", (reason) => {
      console.warn("⚠ Socket disconnected:", reason);
      setConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [userInfo?.token]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  // ✅ FIX: Return the entire context object to support safe access in components
  return useContext(SocketContext);
};