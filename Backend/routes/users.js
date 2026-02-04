import express from 'express';
import marqetaService from '../services/marqetaService.js';
import storageService from '../services/storageService.js';
import { validateToken, supabase } from '../middleware/auth.js';

const router = express.Router();

// Initialize user with Marqeta account
// Called after Supabase signup to create corresponding Marqeta user
router.post('/initialize', validateToken, async (req, res) => {
  try {
    const { userId, userEmail, user } = req;
    const { firstName, lastName } = req.body;

    // Check if user already has a Marqeta token
    let marqetaToken;
    try {
      marqetaToken = await storageService.getUserMarqetaToken(userId);
    } catch (storageError) {
      console.error('[Initialize] Storage error:', storageError.message);
      throw storageError;
    }

    if (marqetaToken) {
      // Already initialized, return existing token
      return res.json({
        success: true,
        data: {
          marqetaUserToken: marqetaToken,
          alreadyInitialized: true
        }
      });
    }

    // Create new Marqeta user (or recover existing one)
    let marqetaUser;
    try {
      marqetaUser = await marqetaService.createUser({
        first_name: firstName || user.user_metadata?.name?.split(' ')[0] || 'User',
        last_name: lastName || user.user_metadata?.name?.split(' ').slice(1).join(' ') || userId.slice(0, 8),
        email: userEmail
      });
    } catch (createError) {
      // Check if user already exists in Marqeta (error code 400057)
      const errorCode = createError.response?.data?.error_code;
      if (errorCode === '400057') {
        // User already exists in Marqeta - recover by looking up by email
        marqetaUser = await marqetaService.findUserByEmail(userEmail);
        if (!marqetaUser || !marqetaUser.token) {
          throw new Error('User exists in Marqeta but could not be found by email. Please contact support.');
        }
      } else {
        throw createError;
      }
    }

    marqetaToken = marqetaUser.token;

    // Store the mapping
    await storageService.setUserMarqetaToken(userId, marqetaToken);

    // Update Supabase user metadata with Marqeta token
    const { error: updateError } = await supabase.auth.admin?.updateUserById?.(userId, {
      user_metadata: { marqeta_user_token: marqetaToken }
    });

    if (updateError) {
      console.log('Note: Could not update Supabase metadata (admin API may not be available)');
    }

    res.json({
      success: true,
      data: {
        marqetaUserToken: marqetaToken,
        marqetaUser: marqetaUser,
        alreadyInitialized: false
      }
    });
  } catch (error) {
    console.error('Error initializing user:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// Get current user's Marqeta info
router.get('/me', validateToken, async (req, res) => {
  try {
    const { userId, userEmail, user } = req;

    const marqetaToken = await storageService.getUserMarqetaToken(userId);

    if (!marqetaToken) {
      return res.json({
        success: true,
        data: {
          initialized: false,
          userId,
          email: userEmail,
          name: user.user_metadata?.name
        }
      });
    }

    // Get Marqeta user details
    let marqetaUser = null;
    let balance = null;

    try {
      marqetaUser = await marqetaService.getUser(marqetaToken);
      balance = await marqetaService.getGPABalance(marqetaToken);
    } catch (error) {
      console.error('Error fetching Marqeta data:', error.message);
    }

    res.json({
      success: true,
      data: {
        initialized: true,
        userId,
        email: userEmail,
        name: user.user_metadata?.name,
        marqetaUserToken: marqetaToken,
        marqetaUser,
        balance: balance?.gpa?.available_balance || 0
      }
    });
  } catch (error) {
    console.error('Error getting user:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's wallet balance
router.get('/balance', validateToken, async (req, res) => {
  try {
    const { userId } = req;
    const marqetaToken = await storageService.getUserMarqetaToken(userId);

    if (!marqetaToken) {
      return res.status(400).json({
        success: false,
        error: 'User not initialized with Marqeta'
      });
    }

    const balance = await marqetaService.getGPABalance(marqetaToken);

    res.json({
      success: true,
      data: {
        balance: balance?.gpa?.available_balance || 0,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting balance:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// Add money to wallet (fund GPA)
router.post('/wallet/add', validateToken, async (req, res) => {
  try {
    const { userId } = req;
    const { amount, memo } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    const marqetaToken = await storageService.getUserMarqetaToken(userId);

    if (!marqetaToken) {
      return res.status(400).json({
        success: false,
        error: 'User not initialized with Marqeta'
      });
    }

    const result = await marqetaService.fundGPA(
      marqetaToken,
      parseFloat(amount),
      memo || 'Added funds to wallet'
    );

    res.json({
      success: true,
      data: {
        transaction: result,
        newBalance: result.gpa?.available_balance
      }
    });
  } catch (error) {
    console.error('Error adding money:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// Get user's transactions
router.get('/transactions', validateToken, async (req, res) => {
  try {
    const { userId } = req;
    const marqetaToken = await storageService.getUserMarqetaToken(userId);

    if (!marqetaToken) {
      return res.status(400).json({
        success: false,
        error: 'User not initialized with Marqeta'
      });
    }

    try {
      const transactions = await marqetaService.getTransactions(marqetaToken);
      res.json({
        success: true,
        data: transactions.data || []
      });
    } catch (marqetaError) {
      // If Marqeta returns 404 or "not found" (no transactions), return empty array
      const status = marqetaError.response?.status;
      const errorMsg = marqetaError.response?.data?.error_message || marqetaError.message || '';
      if (status === 404 || errorMsg.toLowerCase().includes('not found')) {
        return res.json({
          success: true,
          data: []
        });
      }
      throw marqetaError;
    }
  } catch (error) {
    console.error('Error getting transactions:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// ===== CARD ENDPOINTS =====

// Get user's card(s)
router.get('/card', validateToken, async (req, res) => {
  try {
    const { userId } = req;
    const marqetaToken = await storageService.getUserMarqetaToken(userId);

    if (!marqetaToken) {
      return res.status(400).json({
        success: false,
        error: 'User not initialized with Marqeta'
      });
    }

    // Get user's cards
    let cards = [];
    try {
      const cardsResponse = await marqetaService.getCardsForUser(marqetaToken);
      cards = cardsResponse.data || [];
    } catch (cardsError) {
      // Handle "not found" as no cards
      if (cardsError.response?.status === 404) {
        cards = [];
      } else {
        throw cardsError;
      }
    }

    if (cards.length === 0) {
      return res.json({
        success: true,
        data: {
          hasCard: false,
          card: null
        }
      });
    }

    // Get the first active card with full details
    const activeCard = cards.find(c => c.state === 'ACTIVE') || cards[0];
    const cardDetails = await marqetaService.getCardDetails(activeCard.token);

    res.json({
      success: true,
      data: {
        hasCard: true,
        card: {
          token: cardDetails.token,
          pan: cardDetails.pan || null,
          lastFour: cardDetails.last_four,
          expiration: cardDetails.expiration,
          expirationTime: cardDetails.expiration_time,
          cvv: cardDetails.cvv_number || null,
          state: cardDetails.state,
          cardProductToken: cardDetails.card_product_token,
          createdTime: cardDetails.created_time
        }
      }
    });
  } catch (error) {
    console.error('Error getting card:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// Create a card for the user
router.post('/card', validateToken, async (req, res) => {
  try {
    const { userId } = req;
    const marqetaToken = await storageService.getUserMarqetaToken(userId);

    if (!marqetaToken) {
      return res.status(400).json({
        success: false,
        error: 'User not initialized with Marqeta'
      });
    }

    // Check if user already has a card
    let existingCards = { data: [] };
    try {
      existingCards = await marqetaService.getCardsForUser(marqetaToken);
    } catch (cardsError) {
      if (cardsError.response?.status !== 404) {
        throw cardsError;
      }
    }
    
    if (existingCards.data && existingCards.data.length > 0) {
      const activeCard = existingCards.data.find(c => c.state === 'ACTIVE') || existingCards.data[0];
      const cardDetails = await marqetaService.getCardDetails(activeCard.token);
      
      return res.json({
        success: true,
        data: {
          alreadyExists: true,
          card: {
            token: cardDetails.token,
            pan: cardDetails.pan || null,
            lastFour: cardDetails.last_four,
            expiration: cardDetails.expiration,
            expirationTime: cardDetails.expiration_time,
            cvv: cardDetails.cvv_number || null,
            state: cardDetails.state,
            cardProductToken: cardDetails.card_product_token,
            createdTime: cardDetails.created_time
          }
        }
      });
    }

    // Get available card products
    const cardProducts = await marqetaService.listCardProducts();
    if (!cardProducts.data || cardProducts.data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No card products available. Please configure a card product in Marqeta.'
      });
    }

    // Use the first available card product (or you can specify a specific one)
    const cardProductToken = cardProducts.data[0].token;

    // Create the card
    const newCard = await marqetaService.createCard(marqetaToken, cardProductToken);

    res.json({
      success: true,
      data: {
        alreadyExists: false,
        card: {
          token: newCard.token,
          pan: newCard.pan || null,
          lastFour: newCard.last_four,
          expiration: newCard.expiration,
          expirationTime: newCard.expiration_time,
          cvv: newCard.cvv_number || null,
          state: newCard.state,
          cardProductToken: newCard.card_product_token,
          createdTime: newCard.created_time
        }
      }
    });
  } catch (error) {
    console.error('Error creating card:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

// Get Marqeta sandbox/funding status
router.get('/funding-status', validateToken, async (req, res) => {
  try {
    const status = await marqetaService.checkSandboxStatus();

    res.json({
      success: true,
      data: {
        mode: status.isSandbox ? 'SANDBOX' : 'PRODUCTION',
        isSandbox: status.isSandbox,
        unlimitedFunds: status.unlimitedFunds,
        fundingSource: status.fundingSource,
        baseUrl: status.baseUrl,
        fundingInfo: status.fundingInfo,
        message: status.isSandbox 
          ? '🎉 Sandbox mode - Unlimited funds available for testing!' 
          : '⚠️ Production mode - Real money transactions'
      }
    });
  } catch (error) {
    console.error('Error checking funding status:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message
    });
  }
});

export default router;
