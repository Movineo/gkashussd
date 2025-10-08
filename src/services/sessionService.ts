import { Session, USSDState } from '../types';

export class SessionService {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clean up expired sessions every minute
    setInterval(() => this.cleanup(), 60000);
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session && this.isActive(session)) {
      session.lastActivity = new Date();
      return session;
    }
    return undefined;
  }

  createSession(sessionId: string, phoneNumber: string): Session {
    const session: Session = {
      sessionId,
      phoneNumber,
      currentState: USSDState.WELCOME,
      tempData: {},
      lastActivity: new Date()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  updateSession(sessionId: string, updates: Partial<Session>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      session.lastActivity = new Date();
    }
  }

  setTempData(sessionId: string, key: string, value: any): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.tempData[key] = value;
    }
  }

  getTempData(sessionId: string, key: string): any {
    const session = this.getSession(sessionId);
    return session?.tempData[key];
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private isActive(session: Session): boolean {
    return Date.now() - session.lastActivity.getTime() < this.SESSION_TIMEOUT;
  }

  private cleanup(): void {
    const expired: string[] = [];
    this.sessions.forEach((session, id) => {
      if (!this.isActive(session)) {
        expired.push(id);
      }
    });
    expired.forEach(id => this.sessions.delete(id));
  }
}