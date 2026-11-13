// Ambient type augmentation: teach express-session about our session fields so
// `req.session.userId` is typed across the app.
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
  }
}
