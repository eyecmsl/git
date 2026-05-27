"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export function FavoriteButton({ resourceId, className = "" }: { resourceId: string; className?: string }) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ favorited: boolean }>(`/favorites/${resourceId}/check`).then(d => {
      setFavorited(d.favorited);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [resourceId]);

  async function toggle() {
    setLoading(true);
    try {
      if (favorited) {
        await api.delete(`/favorites/${resourceId}`);
        setFavorited(false);
      } else {
        await api.post(`/favorites/${resourceId}`);
        setFavorited(true);
      }
    } catch {}
    setLoading(false);
  }

  return (
    <button onClick={toggle} disabled={loading} className={className} title={favorited ? "Remove from favorites" : "Add to favorites"}>
      {favorited ? "★" : "☆"}
    </button>
  );
}
