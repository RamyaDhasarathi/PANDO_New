import type { Property } from "@/data/properties";
import type { ConversationPhase } from "@/hooks/usePandoConversation";

/** Every screen of the POC lives on "/" — these are states, not routes. */
export type AppState = "welcome" | "conversation" | "understanding" | "recommendations" | "auth" | "property";

export interface Selection {
  property: Property;
  reasons: string[];
  match?: number;
}

/** Selection flow layered on top of the conversation: pick → sign-in gate → detail. */
export interface FlowState {
  stage: "browse" | "auth" | "property";
  selection: Selection | null;
}

export type FlowAction =
  | { type: "select"; selection: Selection; signedIn: boolean }
  | { type: "signedIn" }
  | { type: "cancel" }
  | { type: "back" };

export const initialFlow: FlowState = { stage: "browse", selection: null };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "select":
      return { selection: action.selection, stage: action.signedIn ? "property" : "auth" };
    case "signedIn":
      return state.selection ? { ...state, stage: "property" } : state;
    case "cancel":
    case "back":
      return initialFlow;
  }
}

const PHASE_STATE: Record<ConversationPhase, AppState> = {
  idle: "welcome",
  collecting: "conversation",
  listening: "conversation",
  understanding: "understanding",
  searching: "understanding",
  recommendations: "recommendations",
};

export function deriveAppState(phase: ConversationPhase, flow: FlowState, typing = false): AppState {
  if (flow.stage === "auth") return "auth";
  if (flow.stage === "property") return "property";
  // Starting to type counts as joining the conversation.
  if (phase === "idle" && typing) return "conversation";
  return PHASE_STATE[phase];
}
