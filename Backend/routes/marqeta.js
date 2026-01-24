import express from 'express';
import marqetaService from '../services/marqetaService.js';
import storageService from '../services/storageService.js';
import { validateToken, optionalAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ==================== USERS (Direct Marqeta) ====================

// Create a new Marqeta user
router.post('/users', async (req, res) => {
  try {
    const user = await marqetaService.createUser(req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// List all Marqeta users
router.get('/users', async (req, res) => {
  try {
    const users = await marqetaService.listUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error listing users:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// Get Marqeta user by token
router.get('/users/:token', async (req, res) => {
  try {
    const user = await marqetaService.getUser(req.params.token);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error getting user:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// ==================== CARDS ====================

router.get('/card-products', async (req, res) => {
  try {
    const products = await marqetaService.listCardProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error listing card products:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

router.post('/cards', async (req, res) => {
  try {
    const { userToken, cardProductToken } = req.body;
    const card = await marqetaService.createCard(userToken, cardProductToken);
    res.json({ success: true, data: card });
  } catch (error) {
    console.error('Error creating card:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

router.get('/cards/user/:userToken', async (req, res) => {
  try {
    const cards = await marqetaService.getCardsForUser(req.params.userToken);
    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Error getting cards:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// ==================== BALANCES & FUNDING ====================

router.get('/balance/:userToken', async (req, res) => {
  try {
    const balance = await marqetaService.getGPABalance(req.params.userToken);
    res.json({ success: true, data: balance });
  } catch (error) {
    console.error('Error getting balance:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

router.post('/fund', async (req, res) => {
  try {
    const { userToken, amount, memo } = req.body;
    const result = await marqetaService.fundGPA(userToken, amount, memo);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error funding GPA:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// ==================== PAYMENT REQUESTS (Enhanced for AccountaBills) ====================

// Create a payment request
router.post('/payment-requests', validateToken, async (req, res) => {
  try {
    const { userId, userEmail, user } = req;
    const {
      amount,
      description,
      category,
      imageUrl,
      approvers // Array of { userId, name, email }
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
    }

    if (!approvers || approvers.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one approver is required' });
    }

    const senderMarqetaToken = await storageService.getUserMarqetaToken(userId);

    const requestId = uuidv4();
    const paymentRequest = {
      id: requestId,
      senderId: userId,
      senderEmail: userEmail,
      senderName: user.user_metadata?.name || userEmail,
      senderMarqetaToken: senderMarqetaToken,
      amount: parseFloat(amount),
      description: description || '',
      category: category || 'Other',
      imageUrl: imageUrl || null,
      approvers: approvers.map(a => ({
        userId: a.userId,
        name: a.name,
        email: a.email,
        status: 'pending' // Each approver has their own status
      })),
      status: 'pending',
      notes: null,
      approvedBy: [],
      rejectedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await storageService.createPaymentRequest(paymentRequest);

    res.json({ success: true, data: paymentRequest });
  } catch (error) {
    console.error('Error creating payment request:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all payment requests (with filtering)
router.get('/payment-requests', validateToken, async (req, res) => {
  try {
    const { userId } = req;
    const { filter } = req.query; // 'mine' | 'to-approve' | 'all'

    let requests = await storageService.getAllPaymentRequests();

    if (filter === 'mine') {
      // Requests I submitted
      requests = requests.filter(r => r.senderId === userId);
    } else if (filter === 'to-approve') {
      // Requests where I'm an approver
      requests = requests.filter(r =>
        r.approvers.some(a => a.userId === userId)
      );
    }
    // 'all' or no filter returns all requests (for admin/debug)

    // Sort by most recent first
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error getting payment requests:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a single payment request
router.get('/payment-requests/:id', validateToken, async (req, res) => {
  try {
    const request = await storageService.getPaymentRequest(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Payment request not found' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Error getting payment request:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve a payment request
router.post('/payment-requests/:id/approve', validateToken, async (req, res) => {
  try {
    const { userId, user } = req;
    const { notes } = req.body;

    const paymentRequest = await storageService.getPaymentRequest(req.params.id);

    if (!paymentRequest) {
      return res.status(404).json({ success: false, error: 'Payment request not found' });
    }

    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Payment request already processed' });
    }

    // Check if user is an approver
    const approverIndex = paymentRequest.approvers.findIndex(a => a.userId === userId);
    if (approverIndex === -1) {
      return res.status(403).json({ success: false, error: 'You are not an approver for this request' });
    }

    // Update approver status
    paymentRequest.approvers[approverIndex].status = 'approved';
    paymentRequest.approvers[approverIndex].approvedAt = new Date().toISOString();

    // Add to approvedBy list
    paymentRequest.approvedBy.push({
      userId,
      name: user.user_metadata?.name || userId,
      approvedAt: new Date().toISOString()
    });

    // Check if all approvers have approved
    const allApproved = paymentRequest.approvers.every(a => a.status === 'approved');

    if (allApproved && paymentRequest.senderMarqetaToken) {
      // Fund the sender's GPA with the requested amount
      try {
        const fundResult = await marqetaService.fundGPA(
          paymentRequest.senderMarqetaToken,
          paymentRequest.amount,
          `Approved: ${paymentRequest.description}`
        );
        paymentRequest.fundingResult = fundResult;
      } catch (fundError) {
        console.error('Error funding GPA:', fundError.message);
        // Continue with approval even if funding fails
        paymentRequest.fundingError = fundError.message;
      }
    }

    paymentRequest.status = allApproved ? 'approved' : 'pending';
    paymentRequest.notes = notes || paymentRequest.notes;
    paymentRequest.updatedAt = new Date().toISOString();

    if (allApproved) {
      paymentRequest.approvedAt = new Date().toISOString();
    }

    await storageService.updatePaymentRequest(req.params.id, paymentRequest);

    res.json({ success: true, data: paymentRequest });
  } catch (error) {
    console.error('Error approving payment request:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// Reject a payment request
router.post('/payment-requests/:id/reject', validateToken, async (req, res) => {
  try {
    const { userId, user } = req;
    const { notes } = req.body;

    const paymentRequest = await storageService.getPaymentRequest(req.params.id);

    if (!paymentRequest) {
      return res.status(404).json({ success: false, error: 'Payment request not found' });
    }

    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Payment request already processed' });
    }

    // Check if user is an approver
    const approverIndex = paymentRequest.approvers.findIndex(a => a.userId === userId);
    if (approverIndex === -1) {
      return res.status(403).json({ success: false, error: 'You are not an approver for this request' });
    }

    // One rejection = whole request rejected
    paymentRequest.status = 'rejected';
    paymentRequest.rejectedBy = {
      userId,
      name: user.user_metadata?.name || userId,
      rejectedAt: new Date().toISOString()
    };
    paymentRequest.notes = notes || null;
    paymentRequest.rejectedAt = new Date().toISOString();
    paymentRequest.updatedAt = new Date().toISOString();

    await storageService.updatePaymentRequest(req.params.id, paymentRequest);

    res.json({ success: true, data: paymentRequest });
  } catch (error) {
    console.error('Error rejecting payment request:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TRANSACTIONS & SIMULATIONS ====================

router.post('/simulate/authorization', async (req, res) => {
  try {
    const { cardToken, amount, merchantName } = req.body;
    const result = await marqetaService.simulateAuthorization(
      cardToken,
      parseFloat(amount),
      merchantName || 'TEST_MERCHANT'
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error simulating authorization:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

router.get('/transactions/:userToken', async (req, res) => {
  try {
    const transactions = await marqetaService.getTransactions(req.params.userToken);
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error getting transactions:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

export default router;
