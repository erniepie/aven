import { useState, useEffect } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";

import "./App.css";
import { appDataDir, join } from "@tauri-apps/api/path";
import { saveClaudeToken, getClaudeToken, deleteClaudeToken } from "./store";

function App() {
  const [monitors, setMonitors] = useState<
    Array<{ id: string; is_primary: boolean }>
  >([]);
  const [screenshot, setScreenshot] = useState<string>("");
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [claudeToken, setClaudeToken] = useState<string>("");
  const [isEditingToken, setIsEditingToken] = useState<boolean>(false);

  useEffect(() => {
    handleLoadClaudeToken();
    getMonitors();
  }, []);

  async function getMonitors() {
    const result = await invoke<Array<{ id: string; is_primary: boolean }>>(
      "get_monitors"
    );
    setMonitors(result);
  }

  async function takeScreenshot() {
    console.time("take_screenshot");
    const filePath = await invoke<string>("take_screenshot");
    console.timeEnd("take_screenshot");

    const appDataDirPath = await appDataDir();
    const absoluteFilePath = await join(appDataDirPath, filePath);
    const assetUrl = convertFileSrc(absoluteFilePath);

    setScreenshot(assetUrl);
  }

  function clearScreenshot() {
    setScreenshot("");
  }

  async function handleMoveMouse() {
    await invoke("move_mouse", { x: mouseX, y: mouseY });
  }

  async function handleSaveClaudeToken() {
    await saveClaudeToken(claudeToken);
    alert("Claude API Key saved!");
    setIsEditingToken(false);
  }

  async function handleLoadClaudeToken() {
    const token = await getClaudeToken();
    if (token) {
      setClaudeToken(token);
    } else {
      alert("No Claude API Key found!");
    }
  }

  async function handleClearClaudeToken() {
    await deleteClaudeToken();
    setClaudeToken("");
    alert("Claude API Key deleted!");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Welcome to Aven</h1>

      <div className="absolute top-4 right-4 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Claude API Key:</h2>
        <div className="flex gap-4 items-center">
          {isEditingToken ? (
            <input
              type="text"
              value={claudeToken}
              onChange={(e) => setClaudeToken(e.target.value)}
              placeholder="Enter Claude API Key"
              className="px-3 py-2 border rounded"
              autoFocus
            />
          ) : (
            <span
              onClick={() => setIsEditingToken(true)}
              className="px-3 py-2 border rounded cursor-pointer"
            >
              {claudeToken ? "********" : "Click to enter API Key"}
            </span>
          )}
          {isEditingToken && (
            <button
              onClick={handleSaveClaudeToken}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
          )}
          <button
            onClick={handleClearClaudeToken}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={takeScreenshot}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Take Screenshot
        </button>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Mouse Control:</h2>
          <div className="flex gap-4 items-center">
            <input
              type="number"
              value={mouseX}
              onChange={(e) => setMouseX(parseInt(e.target.value))}
              placeholder="X coordinate"
              className="px-3 py-2 border rounded"
            />
            <input
              type="number"
              value={mouseY}
              onChange={(e) => setMouseY(parseInt(e.target.value))}
              placeholder="Y coordinate"
              className="px-3 py-2 border rounded"
            />
            <button
              onClick={handleMoveMouse}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Move Mouse
            </button>
          </div>
        </div>

        {monitors.length > 0 && (
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Monitors:</h2>
            <ul className="list-disc pl-5">
              {monitors.map((monitor) => (
                <li key={monitor.id}>
                  ID: {monitor.id} {monitor.is_primary && "(Primary)"}
                </li>
              ))}
            </ul>
          </div>
        )}

        {screenshot && (
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Screenshot:</h2>
            <img
              src={screenshot}
              alt="Screenshot"
              className="max-w-full rounded"
            />
            <button
              onClick={clearScreenshot}
              className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Clear Screenshot
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
