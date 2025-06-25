
import React, { useState } from 'react';
import { BankerBotProvider } from '@/context/BankerBotContext';
import FileUpload from '@/components/FileUpload';
import TransactionTable from '@/components/TransactionTable';
import AccountSummary from '@/components/AccountSummary';
import ImportExport from '@/components/ImportExport';
import { Bot, PieChart, Table, Upload, FileSpreadsheet } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'summary' | 'transactions' | 'manage'>('upload');

  const tabs = [
    { id: 'upload', label: 'Upload Files', icon: Upload },
    { id: 'summary', label: 'Summary', icon: PieChart },
    { id: 'transactions', label: 'Transactions', icon: Table },
    { id: 'manage', label: 'Manage', icon: FileSpreadsheet },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return <FileUpload />;
      case 'summary':
        return <AccountSummary />;
      case 'transactions':
        return <TransactionTable />;
      case 'manage':
        return <ImportExport />;
      default:
        return <FileUpload />;
    }
  };

  return (
    <BankerBotProvider>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-green-400 to-blue-500 p-2 rounded-xl">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    BankerBot
                  </h1>
                  <p className="text-sm text-gray-600">Smart Budget Dashboard</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                🔒 All data processed locally in your browser
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white/50 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Welcome Message */}
            {activeTab === 'upload' && (
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to BankerBot! 🦄🌈
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Your friendly financial companion for merging and analyzing bank transactions. 
                  Upload your CSV or Excel files to get started with intelligent budget insights.
                </p>
              </div>
            )}

            {/* Content */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 p-6 sm:p-8">
              {renderContent()}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white/30 backdrop-blur-sm border-t border-white/20 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Bot className="w-6 h-6 text-green-600" />
                <span className="text-lg font-semibold text-gray-900">BankerBot v0.1</span>
              </div>
              <p className="text-gray-600 text-sm">
                Built with 💚 for smart personal finance management
              </p>
              <p className="text-gray-500 text-xs mt-2">
                No data leaves your browser • Fully client-side processing
              </p>
            </div>
          </div>
        </footer>
      </div>
    </BankerBotProvider>
  );
};

export default Index;
