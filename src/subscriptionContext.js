// src/subscriptionContext.js
// Contexto para compartir el estado de suscripción en toda la app
import { createContext, useContext } from 'react'

export const SubscriptionContext = createContext({ isReadOnly: false })
export const useSubscription = () => useContext(SubscriptionContext)
