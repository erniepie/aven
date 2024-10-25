import { create } from "zustand";
import { Message } from "ai/react";
import { getMessages, saveMessages } from "./store";

export type BearState = {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  replaceLastMessage: (message: Message) => void;
};

const messages = await getMessages();

export const useGlobalStore = create<BearState>((set) => ({
  messages,
  setMessages: (messages: Message[]) => set({ messages }),
  addMessage: (message: Message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  replaceLastMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages.slice(0, -1), message],
    })),
}));

useGlobalStore.subscribe((state) => {
  saveMessages(state.messages);
});
