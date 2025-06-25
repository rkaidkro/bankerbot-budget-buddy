
import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { useBadBoyBubbysBanking } from '@/context/BankerBotContext';
import { exportToExcel, importFromExcel } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';
import LoggingPanel from './LoggingPanel';

const ImportExport = () => {
  const { transactions, setTransactions } = useBadBoyBubbysBanking();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (transactions.length === 0) {
      toast({
        title: "No data to export",
        description: "Please upload some bank files first",
        variant: "destructive"
      });
      return;
    }

    const filename = `badboybubby-banking-session-${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(transactions, filename);
    
    toast({
      title: "Session exported!",
      description: `Successfully exported ${transactions.length} transactions`,
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedTransactions = await importFromExcel(file);
      setTransactions(importedTransactions);
      
      toast({
        title: "Session imported!",
        description: `Successfully imported ${importedTransactions.length} transactions`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: "Please make sure you're importing a valid BadBoyBubby's Banking export file",
        variant: "destructive"
      });
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Session Management */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Management</h3>
        <p className="text-gray-600 mb-6">
          Save your current session or restore a previous one. All data is processed locally in your browser.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleExport}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-1"
          >
            <Download className="w-5 h-5" />
            <span>Export Current Session</span>
          </button>
          
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-500 hover:text-green-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Import Previous Session</span>
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>💡 Export your session regularly to save your progress. Import to restore previous work.</p>
        </div>
      </div>

      {/* Logging Panel */}
      <LoggingPanel />
    </div>
  );
};

export default ImportExport;
