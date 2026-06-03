"use client";

import { useEffect } from "react";
import { Client } from "../(tabs)/classrooms/client";
import { useGlobalParams } from "../use-global";

export default function ResultEntry({}) {
  const g = useGlobalParams();
  useEffect(() => {
    if (g.params.entryMode) return;
    g.setParams({
      entryMode: true,
    });
  }, [g.params.entryMode]);
  if (!g.params?.openStudentsForClass) return null;
  return (
    <div>
      <Client />
    </div>
  );
}
