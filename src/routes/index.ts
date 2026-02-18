import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from '../types';
import { db } from '../database/memory-db';
import gradingRoutes from '../features/grading/grading.controller';
import authRoutes from '../features/auth/auth.controller';
import { marketplaceService } from '../services/marketplace.service';
import { transactionService } from '../services/transaction.service';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Use authentication routes
router.use('/auth', authRoutes);

// Use grading routes
router.use('/grading', gradingRoutes);

// Create user (farmer or buyer)
router.post('/users', (req, res) => {
  const { name, phone, type, location } = req.body;
  
  const user = db.createUser({
    id: uuidv4(),
    name,
    phone,
    type: type as UserType,
    location,
    createdAt: new Date()
  });

  res.status(201).json(user);
});

// Get all users
router.get('/users', (req, res) => {
  res.json(db.getAllUsers());
});

// Create listing
router.post('/listings', (req, res) => {
  const { farmerId, produceType, quantity, pricePerKg, certificateId } = req.body;

  const listing = marketplaceService.createListing(
    farmerId,
    produceType,
    quantity,
    pricePerKg,
    certificateId
  );

  res.status(201).json(listing);
});

// Get active listings
router.get('/listings', (req, res) => {
  res.json(marketplaceService.getActiveListings());
});

// Get listing by ID
router.get('/listings/:id', (req, res) => {
  const listing = marketplaceService.getListing(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json(listing);
});

// Initiate purchase
router.post('/transactions', (req, res) => {
  const { listingId, farmerId, buyerId, amount } = req.body;

  const transaction = transactionService.initiatePurchase(
    listingId,
    farmerId,
    buyerId,
    amount
  );

  res.status(201).json(transaction);
});

// Accept order
router.post('/transactions/:id/accept', (req, res) => {
  const transaction = transactionService.acceptOrder(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  // Create escrow
  const escrow = transactionService.createEscrow(transaction.id, transaction.amount);

  res.json({ transaction, escrow });
});

// Lock payment
router.post('/transactions/:id/lock-payment', (req, res) => {
  const result = transactionService.lockPayment(req.params.id);
  if (!result.transaction) {
    return res.status(404).json({ error: 'Transaction or escrow not found' });
  }
  res.json(result);
});

// Mark dispatched
router.post('/transactions/:id/dispatch', (req, res) => {
  const transaction = transactionService.markDispatched(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

// Mark delivered
router.post('/transactions/:id/deliver', (req, res) => {
  const transaction = transactionService.markDelivered(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

// Release funds
router.post('/transactions/:id/release-funds', (req, res) => {
  const result = transactionService.releaseFunds(req.params.id);
  if (!result.transaction) {
    return res.status(404).json({ error: 'Transaction or escrow not found' });
  }
  res.json(result);
});

// Get transaction
router.get('/transactions/:id', (req, res) => {
  const transaction = transactionService.getTransaction(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

export default router;
