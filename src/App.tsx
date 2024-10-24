import { useState, useEffect } from "react";
import { Message } from "ai/react";

import { fetch } from "@tauri-apps/plugin-http";

import "./App.css";
import { saveClaudeToken, getClaudeToken } from "./store";
import { FaEdit } from "react-icons/fa";
import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, generateId, streamText } from "ai";
import { anthropicTools } from "./lib/anthropic-tools";
import { getMonitors } from "./computer";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

function ClaudeAPIKey() {
  const [claudeToken, setClaudeToken] = useState<string>("");
  const [isEditingToken, setIsEditingToken] = useState<boolean>(false);

  useEffect(() => {
    handleLoadClaudeToken();
  }, []);

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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSaveClaudeToken();
    }
  }

  return (
    <div className="absolute top-2 right-2 p-2 bg-white rounded shadow">
      <div className="flex gap-2 items-center">
        <h2 className="text-sm font-semibold">Claude API Key:</h2>
        {isEditingToken ? (
          <input
            type="text"
            value={claudeToken}
            onChange={(e) => setClaudeToken(e.target.value)}
            placeholder="Enter Claude API Key"
            className="px-2 py-1 border rounded text-sm hover:border-gray-300 transition-colors focus:outline-blue-500"
            autoFocus
            onBlur={handleSaveClaudeToken}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="flex items-center gap-2">
            <span
              onClick={() => setIsEditingToken(true)}
              className="px-2 py-1 border rounded cursor-pointer text-sm"
            >
              {claudeToken
                ? `sk-${claudeToken.slice(0, 4)}...`
                : "Click to enter API Key"}
            </span>
            <FaEdit
              onClick={() => setIsEditingToken(true)}
              className="text-blue-500 cursor-pointer hover:text-blue-600 transition-colors text-sm"
            />
          </span>
        )}
      </div>
    </div>
  );
}

function App() {
  const [monitors, setMonitors] = useState<
    Array<{ id: string; is_primary: boolean }>
  >([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");

  useEffect(() => {
    getMonitors().then(setMonitors);
  }, []);

  async function submitMessage(message: string) {
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: message, id: generateId() },
    ]);

    const claudeAPIKey = await getClaudeToken();

    const anthropic = createAnthropic({
      apiKey: claudeAPIKey,
      fetch,
    });

    const computerTool = anthropicTools.computer_20241022({
      displayWidthPx: 1920,
      displayHeightPx: 1080,
      displayNumber: 0, // Optional, for X11 environments
      execute: async ({ action, coordinate, text }) => {
        // Implement your computer control logic here
        // Return the result of the action
        console.log(action, coordinate, text);
      },
    });

    const { textStream } = await streamText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that can control the computer.",
        },
        ...convertToCoreMessages(messages),
      ],
      tools: {
        computer: computerTool,
      },
    });

    let text = "";

    for await (const textPart of textStream) {
      text += textPart;

      // update the last message
      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        { role: "assistant", content: text, id: generateId() },
      ]);

      console.log("textPart", textPart);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      submitMessage(inputMessage);
    }
  }

  return (
    <main className="min-h-screen flex flex-col p-8 bg-gray-50">
      <header className="w-full text-center mb-4">
        <h1 className="text-4xl font-bold text-gray-800">Welcome to Aven</h1>
      </header>

      <ClaudeAPIKey />

      <div className="flex flex-col flex-1 space-y-4 w-full max-w-2xl mx-auto">
        <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-white rounded shadow">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded ${
                message.role === "assistant"
                  ? "bg-blue-100 self-start"
                  : "bg-gray-200 self-end"
              }`}
            >
              <span className="font-semibold">{message.role}:</span>{" "}
              {message.content}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message"
            className="flex-1"
            onKeyDown={handleKeyDown}
          />
          <Button onClick={() => submitMessage(inputMessage)}>Send</Button>
        </div>
      </div>
    </main>
  );
}

export default App;
