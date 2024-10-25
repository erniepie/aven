import { create } from "zustand";
import { Message } from "ai/react";
import { getMessages, saveMessages } from "./store";

export type MessageWithAugmentedContent = Message & {
  augmentedText?: string;
};

export type GlobalState = {
  messages: MessageWithAugmentedContent[];
  setMessages: (messages: MessageWithAugmentedContent[]) => void;
  addMessage: (message: MessageWithAugmentedContent) => void;
  replaceLastMessage: (message: MessageWithAugmentedContent) => void;
  updateLastMessage: (
    updateFn: (
      message: MessageWithAugmentedContent
    ) => Partial<MessageWithAugmentedContent>
  ) => void;
};

const messages = await getMessages();

export const useGlobalStore = create<GlobalState>((set) => ({
  messages,
  setMessages: (messages: MessageWithAugmentedContent[]) => set({ messages }),
  addMessage: (message: MessageWithAugmentedContent) =>
    set((state) => ({ messages: [...state.messages, message] })),
  replaceLastMessage: (message: MessageWithAugmentedContent) =>
    set((state) => ({
      messages: [...state.messages.slice(0, -1), message],
    })),
  updateLastMessage: (
    updateFn: (
      message: MessageWithAugmentedContent
    ) => Partial<MessageWithAugmentedContent>
  ) =>
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
