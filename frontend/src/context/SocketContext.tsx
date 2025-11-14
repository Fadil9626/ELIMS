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

  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("elims_auth_v1") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const token = userInfo?.token;
    if (!token) return;

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
  const ctx = useContext(SocketContext);
  return ctx.socket; // ⬅ return only the socket so useSocket() returns the instance
};
