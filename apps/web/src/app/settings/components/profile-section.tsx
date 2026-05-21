"use client";

import { Avatar } from "@/components/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { type User, patchMe } from "./settings-types";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ProfileSection({ user, goalLabel }: { user: User; goalLabel: string }) {
  const t = useTranslations("settings");
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(user.displayName);
  const debouncedName = useDebounce(displayName, 300);
  const prevDebouncedName = useRef(user.displayName);

  useEffect(() => {
    if (debouncedName === prevDebouncedName.current) return;
    prevDebouncedName.current = debouncedName;
    patchMe({ displayName: debouncedName }).then(() => {
      queryClient.setQueryData<User>(["me"], (old) =>
        old ? { ...old, displayName: debouncedName } : old,
      );
    });
  }, [debouncedName, queryClient]);

  return (
    <>
      <div style={{ margin: "0 24px 6px" }}>
        <span className="t-label" style={{ paddingLeft: 2 }}>
          {t("profile")}
        </span>
      </div>
      <div className="glass" style={{ margin: "8px 24px", padding: "4px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px 14px",
            borderBottom: "1px solid var(--glass-line)",
          }}
        >
          <Avatar name={user.displayName} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: "K2D, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--ink)",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.displayName}
            </p>
            <p
              style={{
                fontFamily: "K2D, sans-serif",
                fontSize: 12,
                color: "var(--ink-soft)",
                marginTop: 2,
              }}
            >
              {goalLabel}
            </p>
          </div>
        </div>
        <div style={{ padding: "12px 18px" }}>
          <label
            htmlFor="displayName"
            style={{
              fontFamily: "K2D, sans-serif",
              fontSize: 12,
              color: "var(--ink-soft)",
              display: "block",
              marginBottom: 6,
            }}
          >
            {t("displayName")}
          </label>
          <div className="glass-input" style={{ height: 44 }}>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
