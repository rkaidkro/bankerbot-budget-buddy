import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { useBadBoyBubbysBanking } from '@/context/BankerBotContext';

const AccountSummary = () => {
  const { getAccountSummaries, transactions } = useBadBoyBubbysBanking();
  const summaries = getAccountSummaries();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalIncome = summaries.reduce((sum, acc) => sum + acc.totalIncome, 0);
  const totalExpenses = summaries.reduce((sum, acc) => sum + acc.totalExpenses, 0);
  const netAmount = totalIncome - totalExpenses;

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Income</p>
              <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${netAmount >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-xl p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Net Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(netAmount)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summaries.map((summary) => (
            <div key={summary.account} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{summary.account}</h4>
                    <p className="text-sm text-gray-500">{summary.transactionCount} transactions</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Income</span>
                  <span className="font-medium text-green-600">{formatCurrency(summary.totalIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expenses</span>
                  <span className="font-medium text-red-600">{formatCurrency(summary.totalExpenses)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Net</span>
                    <span className={`font-bold ${summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.netAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountSummary;
