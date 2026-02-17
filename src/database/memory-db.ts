// In-memory database for POC
import {
  User,
  DigitalQualityCertificate,
  Listing,
  Transaction,
  EscrowAccount
} from '../types';

class MemoryDatabase {
  private users: Map<string, User> = new Map();
  private certificates: Map<string, DigitalQualityCertificate> = new Map();
  private listings: Map<string, Listing> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private escrowAccounts: Map<string, EscrowAccount> = new Map();

  // User operations
  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // Certificate operations
  createCertificate(certificate: DigitalQualityCertificate): DigitalQualityCertificate {
    this.certificates.set(certificate.id, certificate);
    return certificate;
  }

  getCertificate(id: string): DigitalQualityCertificate | undefined {
    return this.certificates.get(id);
  }

  // Listing operations
  createListing(listing: Listing): Listing {
    this.listings.set(listing.id, listing);
    return listing;
  }

  getListing(id: string): Listing | undefined {
    return this.listings.get(id);
  }

  getActiveListings(): Listing[] {
    return Array.from(this.listings.values()).filter(l => l.isActive);
  }

  updateListing(id: string, updates: Partial<Listing>): Listing | undefined {
    const listing = this.listings.get(id);
    if (!listing) return undefined;
    
    const updated = { ...listing, ...updates };
    this.listings.set(id, updated);
    return updated;
  }

  // Transaction operations
  createTransaction(transaction: Transaction): Transaction {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | undefined {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updated = { ...transaction, ...updates, updatedAt: new Date() };
    this.transactions.set(id, updated);
    return updated;
  }

  // Escrow operations
  createEscrow(escrow: EscrowAccount): EscrowAccount {
    this.escrowAccounts.set(escrow.id, escrow);
    return escrow;
  }

  getEscrow(id: string): EscrowAccount | undefined {
    return this.escrowAccounts.get(id);
  }

  getEscrowByTransaction(transactionId: string): EscrowAccount | undefined {
    return Array.from(this.escrowAccounts.values())
      .find(e => e.transactionId === transactionId);
  }

  updateEscrow(id: string, updates: Partial<EscrowAccount>): EscrowAccount | undefined {
    const escrow = this.escrowAccounts.get(id);
    if (!escrow) return undefined;
    
    const updated = { ...escrow, ...updates };
    this.escrowAccounts.set(id, updated);
    return updated;
  }

  // Utility
  clear(): void {
    this.users.clear();
    this.certificates.clear();
    this.listings.clear();
    this.transactions.clear();
    this.escrowAccounts.clear();
  }
}

export const db = new MemoryDatabase();
