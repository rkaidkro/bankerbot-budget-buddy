
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useBadBoyBubbysBanking } from '@/context/BankerBotContext';
import { parseFile } from '@/utils/fileParser';
import { useToast } from '@/hooks/use-toast';
import { logger } from './LoggingPanel';

interface FileStatus {
  file: File;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  transactionCount?: number;
}

const FileUpload = () => {
  const { addTransactions, setFileMappings, fileMappings } = useBadBoyBubbysBanking();
  const { toast } = useToast();
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    logger.info(`Starting upload of ${acceptedFiles.length} files`, { 
      fileNames: acceptedFiles.map(f => f.name) 
    });

    // Initialize file statuses
    const initialStatuses: FileStatus[] = acceptedFiles.map(file => ({
      file,
      status: 'uploading' as const
    }));
    setFileStatuses(initialStatuses);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      
      try {
        logger.info(`Processing file: ${file.name}`, { 
          fileSize: file.size, 
          fileType: file.type,
          fileIndex: i + 1,
          totalFiles: acceptedFiles.length
        });

        const result = await parseFile(file);
        
        // Update file status to success
        setFileStatuses(prev => prev.map(status => 
          status.file === file 
            ? { ...status, status: 'success' as const, transactionCount: result.transactions.length }
            : status
        ));

        // Add transactions to context
        addTransactions(result.transactions);

        // Update file mappings
        const newMapping = {
          fileName: file.name,
          detectedColumns: result.detectedColumns,
          transactionCount: result.transactions.length
        };
        setFileMappings([...fileMappings, newMapping]);

        logger.success(`File processed successfully: ${file.name}`, {
          transactionCount: result.transactions.length,
          detectedColumns: result.detectedColumns
        });

        toast({
          title: "File uploaded successfully!",
          description: `${file.name}: ${result.transactions.length} transactions imported`,
        });

      } catch (error) {
        logger.error(`Failed to process file: ${file.name}`, { 
          error: error.message,
          fileSize: file.size,
          fileType: file.type
        });

        // Update file status to error
        setFileStatuses(prev => prev.map(status => 
          status.file === file 
            ? { ...status, status: 'error' as const, error: error.message }
            : status
        ));

        toast({
          title: "Upload failed",
          description: `${file.name}: ${error.message}`,
          variant: "destructive"
        });
      }
    }

    // Clear file statuses after a delay
    setTimeout(() => {
      setFileStatuses([]);
    }, 5000);

  }, [addTransactions, setFileMappings, fileMappings, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: true
  });

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop your files here!' : 'Upload Bank Files'}
        </h3>
        <p className="text-gray-600 mb-4">
          Drag & drop your CSV or Excel files, or click to browse
        </p>
        <div className="text-sm text-gray-500">
          <p>✅ Supports: CSV, XLS, XLSX</p>
          <p>🔍 Automatically detects columns: Date, Amount, Description, Account</p>
          <p>📊 Smart field mapping for various bank formats</p>
        </div>
      </div>

      {/* File Processing Status */}
      {fileStatuses.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Processing Files</h4>
          <div className="space-y-3">
            {fileStatuses.map((fileStatus, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{fileStatus.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(fileStatus.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {fileStatus.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                  )}
                  {fileStatus.status === 'success' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-600">
                        {fileStatus.transactionCount} transactions
                      </span>
                    </>
                  )}
                  {fileStatus.status === 'error' && (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-600 max-w-xs truncate">
                        {fileStatus.error}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Mappings */}
      {fileMappings.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Uploaded Files</h4>
          <div className="space-y-3">
            {fileMappings.map((mapping, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{mapping.fileName}</h5>
                  <span className="text-sm text-green-600 font-medium">
                    {mapping.transactionCount} transactions
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Detected columns: </span>
                  {mapping.detectedColumns.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
