import type { RelationshipType } from "@/types";

export function partnerLabel(mode?: RelationshipType): string {
  return mode === "platonic" ? "friend" : "partner";
}

export function relationshipLabel(mode?: RelationshipType): string {
  return mode === "platonic" ? "friendship" : "relationship";
}

export function blueprintLabel(mode?: RelationshipType): string {
  return mode === "platonic" ? "Friendship Blueprint" : "Relationship Blueprint";
}
