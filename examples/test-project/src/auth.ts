export interface UserSession {
  userId: string;
  role: "admin" | "customer";
  token: string;
}

export function verifySession(token: string): UserSession | null {
  if (!token || token.length < 10) return null;
  return {
    userId: "usr_12345",
    role: "customer",
    token,
  };
}

export function authorizeCheckout(token: string): boolean {
  const session = verifySession(token);
  return session !== null;
}
