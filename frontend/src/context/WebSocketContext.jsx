import React, { createContext, useContext, useEffect, useRef, useState } from "react";

// Create Context
export const WebSocketContext = createContext(null);

// Hook for easy use
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
};

// Provider Component
export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const tokenRef = useRef(null);

  // Get token from localStorage
  const getToken = () => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    return userInfo?.token || null;
  };

  // WebSocket URL
  const getWsUrl = () => {
    const token = getToken();
    const base = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const wsProtocol = base.startsWith("https") ? "wss" : "ws";
    const wsUrl = base.replace(/^https?:\/\//, `${wsProtocol}://`);
    return `${wsUrl.replace(/\/$/, "")}/ws?token=${encodeURIComponent(token || "")}`;
  };

  const connect = () => {
    const token = getToken();
    if (!token) {
      console.warn("No token found. WebSocket not connecting.");
      return;
    }

    tokenRef.current = token;
    const url = getWsUrl();

    try {
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setWs(socket);
        clearTimeout(reconnectTimeout.current);
      };

      socket.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        setWs(null);

        // Auto-reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          if (tokenRef.current) connect();
        }, 3000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WS Message:", data);
          // You can dispatch to Redux, context, or event bus here
        } catch (err) {
          console.warn("Invalid WS message:", event.data);
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
    }
  };

  // Initial connect + token change listener
  useEffect(() => {
    const token = getToken();
    if (token && !wsRef.current) {
      connect();
    }

    // Listen for token changes (login/logout)
    const handleStorage = () => {
      const newToken = getToken();
      if (newToken !== tokenRef.current) {
        if (wsRef.current) {
          wsRef.current.close();
        }
        if (newToken) {
          connect();
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  const send = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected. Cannot send:", message);
    }
  };

  const value = {
    ws,
    isConnected,
    send,
    reconnect: () => {
      if (wsRef.current) wsRef.current.close();
      connect();
    },
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};