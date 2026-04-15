import React, { createContext, useContext, useState } from 'react'

interface ChatPresenceContextType {
  openCustomerId: string | null
  setOpenCustomer: (id: string) => void
  clearOpenCustomer: () => void
}

const ChatPresenceContext = createContext<ChatPresenceContextType | undefined>(undefined)

export function ChatPresenceProvider({ children }: { children: React.ReactNode }) {
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null)

  const setOpenCustomer = (id: string) => setOpenCustomerId(id)
  const clearOpenCustomer = () => setOpenCustomerId(null)

  return (
    <ChatPresenceContext.Provider value={{ openCustomerId, setOpenCustomer, clearOpenCustomer }}>
      {children}
    </ChatPresenceContext.Provider>
  )
}

export function useChatPresence() {
  const context = useContext(ChatPresenceContext)
  if (context === undefined) {
    throw new Error('useChatPresence must be used within ChatPresenceProvider')
  }
  return context
}
