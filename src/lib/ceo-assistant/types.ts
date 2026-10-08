export type AssistantPeriod = "this_month" | "last_month" | "this_quarter" | "this_year";

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantDataMode = "synthetic" | "aggregates";

export type ToolExecution = {
  name: string;
  result: Record<string, unknown>;
};
