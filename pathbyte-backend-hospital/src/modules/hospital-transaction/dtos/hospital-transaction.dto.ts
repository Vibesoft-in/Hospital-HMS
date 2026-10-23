export interface CreateHospitalTransactionDTO {
  visitId: string;
  transactionType: "Payment" | "Refund" | "Adjustment" | "Advance";
  amount: number;
  paymentMode: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque" | "Insurance" | "Govt Backed";
  referenceNo?: string; // Optional - auto-generated if not provided
  transactionDate?: Date | string; // Optional - defaults to current date if not provided
}

export interface HospitalTransactionResponseDTO {
  transactionId: string;
  visitId: string;
  transactionType: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  transactionDate: Date;
  visit?: any; // Populated visit data
  patient?: any; // Populated patient data
  doctor?: any; // Populated doctor data
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHospitalTransactionDTO {
  visitId?: string;
  transactionType?: "Payment" | "Refund" | "Adjustment" | "Advance";
  amount?: number;
  paymentMode?: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque" | "Insurance" | "Govt Backed";
  referenceNo?: string;
  transactionDate?: Date | string; // Accept both Date and string from frontend
}