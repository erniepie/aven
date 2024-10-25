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

export async function takeScreenshot({
  resizeX,
  resizeY,
}: {
  resizeX: number;
  resizeY: number;
}): Promise<{
  assetUrl: string;
  absoluteFilePath: string;
}> {
  console.time("take_screenshot");
  const filePath = await invoke<string>("take_screenshot", {
    resizeX,
    resizeY,
  });
  console.timeEnd("take_screenshot");

  const appDataDirPath = await appDataDir();
  const absoluteFilePath = await join(appDataDirPath, filePath);
  const assetUrl = convertFileSrc(absoluteFilePath);

  return { assetUrl, absoluteFilePath };
}

export async function moveMouse(x: number, y: number) {
  await invoke("move_mouse", { x, y });
}

export async function mouseClick(
  side: "left" | "right",
  x?: number,
  y?: number
) {
  console.log("-- Mouse click:", { side, x, y });

  if (x === undefined && y === undefined) {
    await invoke("mouse_click", { side });
  } else {
    await invoke("mouse_click", { side, x, y });
  }
}

export async function getCursorPosition() {
  const result = await invoke<{ x: number; y: number }>("get_cursor_position");
  return result;
}
