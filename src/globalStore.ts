import { create } from "zustand";
import { Message } from "ai/react";
import { getMessages, saveMessages } from "./store";

export type GlobalState = {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  replaceLastMessage: (message: Message) => void;
  updateLastMessage: (updateFn: (message: Message) => Partial<Message>) => void;
};

const messages = await getMessages();

export const useGlobalStore = create<GlobalState>((set) => ({
  messages,
  setMessages: (messages: Message[]) => set({ messages }),
  addMessage: (message: Message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  replaceLastMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages.slice(0, -1), message],
    })),
  updateLastMessage: (updateFn: (message: Message) => Partial<Message>) =>
    set((state) => {
      const lastMessage = state.messages[state.messages.length - 1];
      return {
        messages: [
          ...state.messages.slice(0, -1),
          { ...lastMessage, ...updateFn(lastMessage) },
        ],
      };
    }),
}));

useGlobalStore.subscribe((state) => {
  saveMessages(state.messages);
});
