import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";

export async function getMonitors(): Promise<
  Array<{ id: string; is_primary: boolean; width: number; height: number }>
> {
  const result = await invoke<
    Array<{ id: string; is_primary: boolean; width: number; height: number }>
  >("get_monitors");

  return result;
}

export async function takeScreenshot(): Promise<{
  assetUrl: string;
  absoluteFilePath: string;
}> {
  console.time("take_screenshot");
  const filePath = await invoke<string>("take_screenshot");
  console.timeEnd("take_screenshot");

  const appDataDirPath = await appDataDir();
  const absoluteFilePath = await join(appDataDirPath, filePath);
  const assetUrl = convertFileSrc(absoluteFilePath);

  return { assetUrl, absoluteFilePath };
}

export async function moveMouse(x: number, y: number) {
  await invoke("move_mouse", { x, y });
}

export async function mouseClick(side: "left" | "right") {
  await invoke("mouse_click", { side });
}

export async function getCursorPosition() {
  const result = await invoke<{ x: number; y: number }>("get_cursor_position");
  return result;
}
