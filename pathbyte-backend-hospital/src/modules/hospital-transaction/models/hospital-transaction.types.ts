import { Document, Model } from "mongoose";

export interface HospitalTransaction {
  transactionId: string;
  visitId: string; // Reference to hospital visit, daycare appointment, or IPD _id
  transactionType: "Payment" | "Refund" | "Adjustment" | "Advance";
  amount: number; // Can be negative for refunds
  paymentMode: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque" | "Insurance" | "Govt Backed";
  referenceNo?: string;
  transactionDate: Date;
  isAdvance?: boolean; // Flag for advance payments
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string; // Hospital user _id who deleted the record
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalTransactionDoc extends HospitalTransaction, Document {}

export interface HospitalTransactionModel extends Model<HospitalTransactionDoc> {
  createHospitalTransaction(newTransaction: HospitalTransaction): Promise<HospitalTransaction>;
  readHospitalTransactions(query: any, search: any, skip: number, limit: number, joinFilters?: Record<string, string>): Promise<any>;
  countHospitalTransactions(search: any, joinFilters?: Record<string, string>): Promise<number>;
  readHospitalTransaction(transactionId: string): Promise<any>;
  updateHospitalTransaction(transactionId: string, updates: Partial<HospitalTransaction>): Promise<HospitalTransaction>;
  deleteHospitalTransaction(transactionId: string): Promise<void>;
  getTransactionsByVisit(visitId: string): Promise<any[]>;
}