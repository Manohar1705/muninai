import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { knowledgeApi } from "../api";

export function useKnowledge() {
  const [knowledgeObjects, setKnowledgeObjects] = useState([]);

  const { data } = useQuery({
    queryKey: ["knowledge-objects"],
    queryFn: knowledgeApi.getKnowledgeObjects,
  });

  useEffect(() => {
    if (!data) return;
    setKnowledgeObjects(data);
  }, [data]);

  return { knowledgeObjects };
}