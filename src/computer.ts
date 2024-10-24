import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";

export async function getMonitors(): Promise<
  Array<{ id: string; is_primary: boolean }>
> {
  const result = await invoke<Array<{ id: string; is_primary: boolean }>>(
    "get_monitors"
  );

  return result;
}

export async function takeScreenshot(): Promise<string> {
  console.time("take_screenshot");
  const filePath = await invoke<string>("take_screenshot");
  console.timeEnd("take_screenshot");

  const appDataDirPath = await appDataDir();
  const absoluteFilePath = await join(appDataDirPath, filePath);
  const assetUrl = convertFileSrc(absoluteFilePath);

  return assetUrl;
}

export async function moveMouse(x: number, y: number) {
  await invoke("move_mouse", { x, y });
}
