// Persistent storage using Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key for server-side operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

class StorageService {
  constructor() {
    // In-memory cache for faster lookups
    this.userMarqetaTokensCache = new Map();
    this.paymentRequestsCache = new Map();
  }

  // =====================
  // User-Marqeta Token Mapping (Supabase-backed)
  // =====================

  async setUserMarqetaToken(userId, marqetaToken) {
    // Update cache
    this.userMarqetaTokensCache.set(userId, marqetaToken);

    // Persist to Supabase
    const { error } = await supabase
      .from('user_marqeta_tokens')
      .upsert({
        user_id: userId,
        marqeta_token: marqetaToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving Marqeta token to Supabase:', error);
      // Don't throw - we still have the in-memory cache as fallback
    }
  }

  async getUserMarqetaToken(userId) {
    // Check cache first
    if (this.userMarqetaTokensCache.has(userId)) {
      return this.userMarqetaTokensCache.get(userId);
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('user_marqeta_tokens')
      .select('marqeta_token')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[StorageService] Supabase error:', error);
    }

    if (data?.marqeta_token) {
      // Update cache
      this.userMarqetaTokensCache.set(userId, data.marqeta_token);
      return data.marqeta_token;
    }

    return null;
  }

  async getUserByMarqetaToken(marqetaToken) {
    // Check cache first
    for (const [userId, token] of this.userMarqetaTokensCache.entries()) {
      if (token === marqetaToken) {
        return userId;
      }
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('user_marqeta_tokens')
      .select('user_id')
      .eq('marqeta_token', marqetaToken)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user by Marqeta token:', error);
    }

    return data?.user_id || null;
  }

  // =====================
  // Payment Requests (Supabase-backed)
  // =====================

  async createPaymentRequest(request) {
    // Update cache
    this.paymentRequestsCache.set(request.id, request);

    // Persist to Supabase
    const { error } = await supabase
      .from('payment_requests')
      .insert({
        id: request.id,
        sender_id: request.senderId,
        sender_name: request.senderName,
        sender_email: request.senderEmail,
        amount: request.amount,
        description: request.description,
        category: request.category,
        image_url: request.imageUrl,
        status: request.status,
        approvers: request.approvers,
        approved_by: request.approvedBy,
        rejected_by: request.rejectedBy,
        notes: request.notes,
        created_at: request.createdAt,
        updated_at: request.updatedAt
      });

    if (error) {
      console.error('Error saving payment request to Supabase:', error);
    }

    return request;
  }

  async getPaymentRequest(id) {
    // Check cache first
    if (this.paymentRequestsCache.has(id)) {
      return this.paymentRequestsCache.get(id);
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching payment request:', error);
    }

    if (data) {
      const request = this._mapDbToRequest(data);
      this.paymentRequestsCache.set(id, request);
      return request;
    }

    return null;
  }

  async getAllPaymentRequests() {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all payment requests:', error);
      return Array.from(this.paymentRequestsCache.values());
    }

    const requests = data.map(row => this._mapDbToRequest(row));

    // Update cache
    requests.forEach(req => this.paymentRequestsCache.set(req.id, req));

    return requests;
  }

  async getPaymentRequestsBySender(userId) {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment requests by sender:', error);
      return Array.from(this.paymentRequestsCache.values()).filter(req => req.senderId === userId);
    }

    return data.map(row => this._mapDbToRequest(row));
  }

  async getPaymentRequestsByReceiver(userId) {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment requests:', error);
      return Array.from(this.paymentRequestsCache.values()).filter(req =>
        req.approvers && req.approvers.some(a => a.userId === userId)
      );
    }

    // Filter for requests where the user is an approver
    return data
      .map(row => this._mapDbToRequest(row))
      .filter(req => req.approvers && req.approvers.some(a => a.userId === userId));
  }

  async updatePaymentRequest(id, updates) {
    const request = await this.getPaymentRequest(id);
    if (!request) return null;

    const updated = { ...request, ...updates, updatedAt: new Date().toISOString() };

    // Update cache
    this.paymentRequestsCache.set(id, updated);

    // Persist to Supabase
    const { error } = await supabase
      .from('payment_requests')
      .update({
        status: updated.status,
        approvers: updated.approvers,
        approved_by: updated.approvedBy,
        rejected_by: updated.rejectedBy,
        notes: updated.notes,
        updated_at: updated.updatedAt
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating payment request:', error);
    }

    return updated;
  }

  async deletePaymentRequest(id) {
    this.paymentRequestsCache.delete(id);

    const { error } = await supabase
      .from('payment_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting payment request:', error);
      return false;
    }

    return true;
  }

  // Helper to map database row to request object
  _mapDbToRequest(row) {
    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderEmail: row.sender_email,
      amount: row.amount,
      description: row.description,
      category: row.category,
      imageUrl: row.image_url,
      status: row.status,
      approvers: row.approvers,
      approvedBy: row.approved_by,
      rejectedBy: row.rejected_by,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Export singleton instance
const storageService = new StorageService();
export default storageService;
