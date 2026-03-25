import { useEffect, useState } from "react";

export function useAutoToggle(interval: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), interval);
    return () => clearInterval(id);
  }, [interval]);
  return on;
}
