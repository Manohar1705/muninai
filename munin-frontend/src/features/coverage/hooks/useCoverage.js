import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { coverageApi } from "../api";

export function useCoverage() {
  const [topics, setTopics] = useState([]);
  const [gaps, setGaps] = useState([]);

  const { data } = useQuery({
    queryKey: ["coverage"],
    queryFn: coverageApi.getCoverage,
  });

  useEffect(() => {
    if (!data) return;

    setTopics(data.topics);
    setGaps(data.gaps);
  }, [data]);

  return {
    topics,
    gaps,
  };
}