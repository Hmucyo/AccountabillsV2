import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No authorization token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // Attach user info to request
    req.user = user;
    req.userId = user.id;
    req.userEmail = user.email;

    // Get Marqeta token from user metadata if it exists
    req.marqetaUserToken = user.user_metadata?.marqeta_user_token || null;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, error: 'Authentication failed' });
  }
}

// Optional auth - doesn't fail if no token, but attaches user if present
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    req.userId = null;
    return next();
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;
      req.userId = user.id;
      req.userEmail = user.email;
      req.marqetaUserToken = user.user_metadata?.marqeta_user_token || null;
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
}

export { supabase };
