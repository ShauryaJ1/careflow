export const entitlementsByUserType = {
  user: {
    maxMessagesPerDay: 50,
    maxDocuments: 10,
    canUseAdvancedFeatures: false,
  },
  premium: {
    maxMessagesPerDay: 500,
    maxDocuments: 100,
    canUseAdvancedFeatures: true,
  },
  admin: {
    maxMessagesPerDay: Infinity,
    maxDocuments: Infinity,
    canUseAdvancedFeatures: true,
  },
} as const;

export type UserType = keyof typeof entitlementsByUserType;