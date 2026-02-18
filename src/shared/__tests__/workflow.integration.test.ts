// Integration test for the complete workflow
import { v4 as uuidv4 } from 'uuid';
import { UserType, TransactionStatus } from '../../types';
import { db } from '../database/memory-db';
import { gradingService } from '../features/grading';
import { marketplaceService } from '../features/marketplace';
import { transactionService } from '../features/transactions';

describe('Complete Workflow Integration Test', () => {
  beforeEach(() => {
    db.clear();
  });

  it('should complete the full farmer-to-buyer workflow', () => {
    // Step 1: Create Farmer
    const farmer = db.createUser({
      id: uuidv4(),
      name: 'Test Farmer',
      phone: '+919999999999',
      type: UserType.FARMER,
      location: 'Punjab',
      createdAt: new Date()
    });

    expect(farmer).toBeDefined();
    expect(farmer.type).toBe(UserType.FARMER);

    // Step 2: Create Buyer
    const buyer = db.createUser({
      id: uuidv4(),
      name: 'Test Buyer',
      phone: '+919999999998',
      type: UserType.BUYER,
      location: 'Delhi',
      createdAt: new Date()
    });

    expect(buyer).toBeDefined();
    expect(buyer.type).toBe(UserType.BUYER);

    // Step 3: Grade Produce
    const gradingResult = gradingService.gradeProduceImage('test_image', {
      lat: 30.7333,
      lng: 76.7794
    });

    expect(gradingResult).toBeDefined();
    expect(gradingResult.grade).toMatch(/^[ABC]$/);

    // Step 4: Generate Certificate
    const certificate = gradingService.generateCertificate(
      farmer.id,
      'Wheat',
      gradingResult,
      'test_hash'
    );

    expect(certificate).toBeDefined();
    expect(certificate.farmerId).toBe(farmer.id);

    // Step 5: Create Listing
    const listing = marketplaceService.createListing(
      farmer.id,
      'Wheat',
      1000,
      25,
      certificate.id
    );

    expect(listing).toBeDefined();
    expect(listing.isActive).toBe(true);

    // Step 6: Initiate Purchase
    const transaction = transactionService.initiatePurchase(
      listing.id,
      farmer.id,
      buyer.id,
      25000
    );

    expect(transaction).toBeDefined();
    expect(transaction.status).toBe(TransactionStatus.PENDING);

    // Step 7: Accept Order
    const acceptedTransaction = transactionService.acceptOrder(transaction.id);
    expect(acceptedTransaction?.status).toBe(TransactionStatus.ACCEPTED);

    // Step 8: Create Escrow
    const escrow = transactionService.createEscrow(transaction.id, transaction.amount);
    expect(escrow).toBeDefined();
    expect(escrow.isLocked).toBe(false);

    // Step 9: Lock Payment
    const { transaction: lockedTxn, escrow: lockedEscrow } = 
      transactionService.lockPayment(transaction.id);
    
    expect(lockedTxn?.status).toBe(TransactionStatus.PAYMENT_LOCKED);
    expect(lockedEscrow?.isLocked).toBe(true);

    // Step 10: Dispatch
    const dispatchedTxn = transactionService.markDispatched(transaction.id);
    expect(dispatchedTxn?.status).toBe(TransactionStatus.IN_TRANSIT);

    // Step 11: Deliver
    const deliveredTxn = transactionService.markDelivered(transaction.id);
    expect(deliveredTxn?.status).toBe(TransactionStatus.DELIVERED);

    // Step 12: Release Funds
    const { transaction: completedTxn, escrow: releasedEscrow } = 
      transactionService.releaseFunds(transaction.id);
    
    expect(completedTxn?.status).toBe(TransactionStatus.COMPLETED);
    expect(releasedEscrow?.isLocked).toBe(false);
  });

  it('should handle order rejection', () => {
    const farmer = db.createUser({
      id: uuidv4(),
      name: 'Test Farmer',
      phone: '+919999999999',
      type: UserType.FARMER,
      location: 'Punjab',
      createdAt: new Date()
    });

    const buyer = db.createUser({
      id: uuidv4(),
      name: 'Test Buyer',
      phone: '+919999999998',
      type: UserType.BUYER,
      location: 'Delhi',
      createdAt: new Date()
    });

    const transaction = transactionService.initiatePurchase(
      'listing-123',
      farmer.id,
      buyer.id,
      10000
    );

    const rejectedTransaction = transactionService.rejectOrder(transaction.id);
    expect(rejectedTransaction?.status).toBe(TransactionStatus.REJECTED);
  });
});
