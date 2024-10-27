import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";

export type Monitor = {
  id: string;
  name: string;
  is_primary: boolean;
  width: number;
  height: number;
};

export async function getMonitors(): Promise<Array<Monitor>> {
  const result = await invoke<Array<Monitor>>("get_monitors");

  return result;
}

export async function takeScreenshot({
  monitorId,
  resizeX,
  resizeY,
}: {
  monitorId: string;
  resizeX: number;
  resizeY: number;
}): Promise<{
  assetUrl: string;
  absoluteFilePath: string;
}> {
  console.time("take_screenshot");
  const filePath = await invoke<string>("take_screenshot", {
    monitorId,
    resizeX,
    resizeY,
  });
  console.timeEnd("take_screenshot");

  const appDataDirPath = await appDataDir();
  const absoluteFilePath = await join(appDataDirPath, filePath);
  const assetUrl = convertFileSrc(absoluteFilePath);

  return { assetUrl, absoluteFilePath };
}

export async function moveMouse(monitorId: string, x: number, y: number) {
  await invoke("move_mouse", { monitorId, x, y });
}

export async function mouseClick(
  monitorId: string,
  side: "left" | "right",
  x?: number,
  y?: number
) {
  console.log("-- Mouse click:", { side, x, y });

  if (x === undefined && y === undefined) {
    await invoke("mouse_click", { monitorId, side });
  } else {
    await invoke("mouse_click", { monitorId, side, x, y });
  }
}

export async function getCursorPosition(monitorId: string) {
  const result = await invoke<{ x: number; y: number }>("get_cursor_position", {
    monitorId,
  });
  return result;
}

export async function typeText(text: string) {
  await invoke("type_text", { text });
}

export async function pressKey(key: string) {
  await invoke("press_key", { key });
}
