import { load } from "@tauri-apps/plugin-store";

const store = await load("store.json", { autoSave: false });

export async function saveClaudeToken(token: string) {
  store.set("claude_token", token);
  await store.save();
}

export async function getClaudeToken(): Promise<string | undefined> {
  return store.get("claude_token");
}

export async function deleteClaudeToken() {
  store.delete("claude_token");
  await store.save();
}
