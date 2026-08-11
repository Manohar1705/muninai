import React, { createContext, useCallback, useContext, useState } from "react";
import { C, FF } from "./common";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: C.bgCard,
              border: `1px solid ${t.type === "error" ? C.red : C.green}`,
              borderRadius: 8,
              padding: "10px 14px",
              color: C.text,
              fontFamily: FF.sans,
              fontSize: 13.5,
              maxWidth: 320,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}