export type Transaction = {
  id: string;
  memberId: string;
  type: 'in' | 'out';
  amount: number;
  date: string; // ISO 8601 format
  remarks: string;
  createdAt: string; // ISO 8601 format
};

export type Member = {
  id: string;
  accountNumber: string;
  name: string;
  houseNumber: string;
  husbandName?: string;
  address: string;
  phone: string;
  whatsapp?: string;
  block: string;
  blockId: string;
  cluster: string;
  clusterId: string;
  totalIn: number;
  totalOut: number;
  balance: number;
  transactions: Transaction[];
  hasPaidRegistrationFee: boolean;
};

export type Cluster = {
  id: string;
  blockId: string;
  name: string;
  members: Member[];
};

export type Block = {
  id: string;
  name: string;
  clusters: Cluster[];
};

export type AppSettings = {
  bankName: string;
  logoUrl: string | null;
};

export type AdminTransaction = {
    id: string;
    memberId: string;
    type: 'registration_fee' | 'passbook_fee';
    amount: number;
    date: string; // ISO 8601
};

export type BankTransaction = {
    id: string;
    date: string; // YYYY-MM-DD
    type: 'deposit' | 'withdrawal';
    transacterName: string;
    phoneNumber?: string;
    amount: number;
    transactionNumber?: string;
    remarks?: string;
};
