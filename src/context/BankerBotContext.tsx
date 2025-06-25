
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Transaction, FileMapping, AccountSummary } from '@/types/transaction';

interface BankerBotContextType {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransactions: (newTransactions: Transaction[]) => void;
  deleteTransaction: (id: string) => void;
  fileMappings: FileMapping[];
  setFileMappings: (mappings: FileMapping[]) => void;
  getAccountSummaries: () => AccountSummary[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

const BankerBotContext = createContext<BankerBotContextType | undefined>(undefined);

export const useBankerBot = () => {
  const context = useContext(BankerBotContext);
  if (!context) {
    throw new Error('useBankerBot must be used within a BankerBotProvider');
  }
  return context;
};

export const BankerBotProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fileMappings, setFileMappings] = useState<FileMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');

  const addTransactions = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTransactions]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const getAccountSummaries = (): AccountSummary[] => {
    const summaries = transactions.reduce((acc, transaction) => {
      const account = transaction.account;
      if (!acc[account]) {
        acc[account] = {
          account,
          totalIncome: 0,
          totalExpenses: 0,
          netAmount: 0,
          transactionCount: 0
        };
      }
      
      if (transaction.amount > 0) {
        acc[account].totalIncome += transaction.amount;
      } else {
        acc[account].totalExpenses += Math.abs(transaction.amount);
      }
      
      acc[account].netAmount += transaction.amount;
      acc[account].transactionCount++;
      
      return acc;
    }, {} as Record<string, AccountSummary>);

    return Object.values(summaries);
  };

  return (
    <BankerBotContext.Provider value={{
      transactions,
      setTransactions,
      addTransactions,
      deleteTransaction,
      fileMappings,
      setFileMappings,
      getAccountSummaries,
      searchTerm,
      setSearchTerm,
      selectedAccount,
      setSelectedAccount,
    }}>
      {children}
    </BankerBotContext.Provider>
  );
};
