export type User = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
};
export type Account = {
  id: number;
  accountNumber: string;
  currency: string;
  balance: string;
  name: string;
  holderName: string;
};
export type Transfer = {
  id: number;
  reference: string;
  sourceAccountNumber: string;
  targetAccountNumber: string;
  sourceHolderName: string;
  targetHolderName: string;
  amount: string;
  description: string;
  status: "COMPLETED" | "PENDING_APPROVAL" | "REJECTED";
  createdAt: string;
  decidedAt?: string;
  decisionReason?: string;
  createdBy: number;
  decidedBy?: number;
};
export type Dashboard = {
  totalBalance: string;
  accountCount: number;
  incomingTotal: string;
  outgoingTotal: string;
  pendingCount: number;
  recentTransfers: Transfer[];
};
export type Beneficiary = {
  accountNumber: string;
  holderName: string;
  label: string;
};
export type Transaction = {
  id: number;
  transferId: number;
  type: "DEBIT" | "CREDIT";
  amount: string;
  balanceAfter: string;
  description: string;
  createdAt: string;
};
export type Audit = {
  id: number;
  eventType: string;
  actorName: string;
  reference: string;
  details: string;
  createdAt: string;
};
export type TransferInput = {
  sourceAccountId: number;
  targetAccountNumber: string;
  amount: string;
  description: string;
};
