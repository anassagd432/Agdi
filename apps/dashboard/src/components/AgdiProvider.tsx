"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export type AgdiEventCallback = (data: any) => void;

export interface AgdiContextState {
  url: string | null;
  token: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (url: string, token: string) => void;
  disconnect: () => void;
  sendMessage: (payload: any) => void;
  request: <T = any>(method: string, params?: any) => Promise<T>;
  subscribe: (callback: AgdiEventCallback) => void;
  unsubscribe: (callback: AgdiEventCallback) => void;
}

const AgdiContext = createContext<AgdiContextState | undefined>(undefined);

export function AgdiProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: (val: any) => void, reject: (err: any) => void, timer: NodeJS.Timeout }>>(new Map());
  const listeners = useRef<Set<AgdiEventCallback>>(new Set());

  // Load credentials from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem("agdi_gateway_url");
    const savedToken = localStorage.getItem("agdi_gateway_token");
    if (savedUrl) {
      setUrl(savedUrl);
      setToken(savedToken);
    }
  }, []);

  const clearPendingRequests = useCallback((err: Error) => {
    pendingRequests.current.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(err);
    });
    pendingRequests.current.clear();
  }, []);

  const connectWebSocket = useCallback((targetUrl: string, targetToken: string | null) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setIsConnecting(true);
    setError(null);

    try {
      // Handle missing protocol
      let wsUrl = targetUrl;
      if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
        wsUrl = wsUrl.startsWith("localhost") || wsUrl.startsWith("127.0.0.1") 
          ? `ws://${wsUrl}` 
          : `wss://${wsUrl}`;
      }

      // Append token to query if provided
      if (targetToken) {
        const parsedUrl = new URL(wsUrl);
        parsedUrl.searchParams.set("token", targetToken);
        wsUrl = parsedUrl.toString();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[AgdiProvider] Connected to Gateway:", targetUrl);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);

        // Send a Hello message to identify the client
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          method: "hello",
          params: { clientName: "dashboard", version: "1.0", role: "operator", mode: "dashboard" }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.id && pendingRequests.current.has(data.id)) {
            const req = pendingRequests.current.get(data.id)!;
            clearTimeout(req.timer);
            pendingRequests.current.delete(data.id);
            if (data.error) {
              req.reject(new Error(data.error.message || "RPC Error"));
            } else {
              req.resolve(data.result);
            }
          } else if (data.method) {
            // Handle server-to-client events
            listeners.current.forEach(cb => cb(data));
          }
        } catch (e) {
          console.error("[AgdiProvider] Failed to parse message:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("[AgdiProvider] WebSocket error:", e);
        setError("Failed to connect to Agdi Gateway. Check the URL and Token.");
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log("[AgdiProvider] Disconnected from Gateway.");
        setIsConnected(false);
        setIsConnecting(false);
        clearPendingRequests(new Error("WebSocket closed"));
        
        // Auto-reconnect if we still have credentials intent
        if (targetUrl) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[AgdiProvider] Attempting reconnect...");
            connectWebSocket(targetUrl, targetToken);
          }, 3000);
        }
      };
    } catch (err: any) {
      console.error("[AgdiProvider] Setup error:", err);
      setError(err.message || "Invalid connection string");
      setIsConnecting(false);
    }
  }, [clearPendingRequests]);

  // Connect automatically when URL is set
  useEffect(() => {
    if (url) {
      connectWebSocket(url, token);
    }
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [url, token, connectWebSocket]);

  const connectUser = useCallback((newUrl: string, newToken: string) => {
    // Strip trailing slashes
    const cleanUrl = newUrl.replace(/\/+$/, "");
    localStorage.setItem("agdi_gateway_url", cleanUrl);
    if (newToken) {
      localStorage.setItem("agdi_gateway_token", newToken);
    } else {
      localStorage.removeItem("agdi_gateway_token");
    }
    setUrl(cleanUrl);
    setToken(newToken);
  }, []);

  const disconnectUser = useCallback(() => {
    localStorage.removeItem("agdi_gateway_url");
    localStorage.removeItem("agdi_gateway_token");
    setUrl(null);
    setToken(null);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    clearPendingRequests(new Error("Disconnected by user"));
  }, [clearPendingRequests]);

  const sendMessage = useCallback((payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      console.warn("[AgdiProvider] Cannot send message, WebSocket is not open.");
    }
  }, []);

  const request = useCallback(<T = any>(method: string, params?: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return reject(new Error("WebSocket is not connected"));
      }
      
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      
      const timer = setTimeout(() => {
        pendingRequests.current.delete(id);
        reject(new Error(`Request to ${method} timed out`));
      }, 15000);
      
      pendingRequests.current.set(id, { resolve, reject, timer });
      
      wsRef.current.send(JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params
      }));
    });
  }, []);

  const subscribe = useCallback((callback: AgdiEventCallback) => {
    listeners.current.add(callback);
  }, []);

  const unsubscribe = useCallback((callback: AgdiEventCallback) => {
    listeners.current.delete(callback);
  }, []);

  return (
    <AgdiContext.Provider value={{ 
      url, token, isConnected, isConnecting, error, 
      connect: connectUser, 
      disconnect: disconnectUser, 
      sendMessage, 
      request,
      subscribe,
      unsubscribe
    }}>
      {children}
    </AgdiContext.Provider>
  );
}

export function useAgdi() {
  const context = useContext(AgdiContext);
  if (context === undefined) {
    throw new Error("useAgdi must be used within an AgdiProvider");
  }
  return context;
}
