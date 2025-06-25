import React, { useCallback, useState } from 'react';
import { Upload, File, CheckCircle, AlertCircle } from 'lucide-react';
import { useBadBoyBubbysBanking } from '@/context/BankerBotContext';
import { parseCSV, parseXLS, convertMappingToTransactions } from '@/utils/fileParser';
import { useToast } from '@/hooks/use-toast';

const FileUpload = () => {
  const { addTransactions, fileMappings, setFileMappings } = useBadBoyBubbysBanking();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleFiles = useCallback(async (files: FileList) => {
    setProcessing(true);
    const newMappings = [...fileMappings];
    
    for (const file of Array.from(files)) {
      try {
        const extension = file.name.split('.').pop()?.toLowerCase();
        let mapping;
        
        if (extension === 'csv') {
          mapping = await parseCSV(file);
        } else if (extension === 'xls' || extension === 'xlsx') {
          mapping = await parseXLS(file);
        } else {
          toast({
            title: "Unsupported file type",
            description: `${file.name} is not a supported format. Please use CSV or Excel files.`,
            variant: "destructive"
          });
          continue;
        }
        
        newMappings.push(mapping);
        
        // Auto-process if we have good field detection
        if (mapping.dateColumn !== -1 && mapping.amountColumn !== -1) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              let fullData;
              if (extension === 'csv') {
                const Papa = await import('papaparse');
                const result = Papa.default.parse(e.target?.result as string, { header: true, skipEmptyLines: true });
                fullData = result.data;
              } else {
                const XLSX = await import('xlsx');
                const workbook = XLSX.read(e.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                fullData = XLSX.utils.sheet_to_json(worksheet);
              }
              
              const transactions = convertMappingToTransactions(mapping, fullData);
              addTransactions(transactions);
              
              toast({
                title: "File processed successfully!",
                description: `Added ${transactions.length} transactions from ${file.name}`,
              });
            } catch (error) {
              console.error('Error processing file:', error);
              toast({
                title: "Processing error",
                description: `Failed to process ${file.name}. Please check the file format.`,
                variant: "destructive"
              });
            }
          };
          
          if (extension === 'csv') {
            reader.readAsText(file);
          } else {
            reader.readAsBinaryString(file);
          }
        }
        
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: "Upload error",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
      }
    }
    
    setFileMappings(newMappings);
    setProcessing(false);
  }, [addTransactions, fileMappings, setFileMappings, toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div className="w-full">
      <div 
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragActive 
            ? 'border-green-400 bg-green-50 scale-105' 
            : 'border-gray-300 hover:border-green-300 hover:bg-green-50'
        } ${processing ? 'opacity-75 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".csv,.xls,.xlsx"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={processing}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
            {processing ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : (
              <Upload className="w-8 h-8 text-white" />
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {processing ? 'Processing files...' : 'Upload Your Bank Files'}
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your CSV or Excel files here, or click to browse
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <File className="w-4 h-4" />
                <span>CSV</span>
              </span>
              <span className="flex items-center space-x-1">
                <File className="w-4 h-4" />
                <span>Excel</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {fileMappings.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="font-medium text-gray-900">Uploaded Files:</h4>
          {fileMappings.map((mapping, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {mapping.dateColumn !== -1 && mapping.amountColumn !== -1 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <span className="text-sm font-medium">{mapping.fileName}</span>
              <span className="text-xs text-gray-500">
                {mapping.headers.length} columns detected
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
