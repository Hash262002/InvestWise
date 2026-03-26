import { useState } from 'react';
import apiClient, { holdingAPI } from '../../services/api';

interface ImportData {
  symbol?: string;
  name?: string;
  quantity?: number;
  averageCost?: number;
  assetType?: string;
  exchange?: string;
  sector?: string;
  [key: string]: any;
}

interface ImportPortfolioModalProps {
  readonly portfolioId: string;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export default function ImportPortfolioModal({ portfolioId, onClose, onSuccess }: Readonly<ImportPortfolioModalProps>) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ImportData[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping'>('upload');
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdHoldings, setCreatedHoldings] = useState<any[]>([]);

  // Parse CSV to JSON
  const parseCSV = (text: string): ImportData[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: ImportData[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const row: ImportData = {};

      headers.forEach((header, idx) => {
        const value = values[idx];
        row[header] = value;
      });

      rows.push(row);
    }

    return rows;
  };

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
  };

  // Parse and preview CSV
  const handleParseCsv = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    try {
      const text = await file.text();
      const data = parseCSV(text);
      
      if (data.length === 0) {
        setError('No data rows found in CSV');
        return;
      }

      setParsedData(data);
      
      // Auto-detect columns
      const mapping: { [key: string]: string } = {};
      const csvHeaders = Object.keys(data[0]);
      
      csvHeaders.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('symbol')) mapping[header] = 'symbol';
        else if (lowerHeader.includes('name')) mapping[header] = 'name';
        else if (lowerHeader.includes('qty') || lowerHeader.includes('quantity')) mapping[header] = 'quantity';
        else if (lowerHeader.includes('price') || lowerHeader.includes('cost')) mapping[header] = 'averageCost';
        else if (lowerHeader.includes('type') || lowerHeader.includes('asset')) mapping[header] = 'assetType';
        else if (lowerHeader.includes('exchange')) mapping[header] = 'exchange';
        else if (lowerHeader.includes('sector')) mapping[header] = 'sector';
      });

      setColumnMapping(mapping);
      setStep('mapping');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV');
    }
  };

  // Update column mapping
  const handleMappingChange = (csvCol: string, targetField: string) => {
    const newMapping = { ...columnMapping };
    if (targetField === '') {
      delete newMapping[csvCol];
    } else {
      newMapping[csvCol] = targetField;
    }
    setColumnMapping(newMapping);
  };

  // Submit import - create all holdings in portfolio with ONE API call
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Transform ALL parsed data using column mapping into array
      const transformedData = parsedData.map(row => {
        const transformed: ImportData = {};
        Object.entries(columnMapping).forEach(([csvCol, targetField]) => {
          if (targetField && row[csvCol] !== undefined) {
            // Convert to appropriate types
            let value: any = row[csvCol];
            if (targetField === 'quantity') {
              value = parseFloat(value) || 0;
            } else if (targetField === 'averageCost') {
              value = parseFloat(value) || 0;
            }
            transformed[targetField] = value;
          }
        });
        return transformed;
      });

      // Validate all holdings have required fields
      const invalid = transformedData.filter(h => !h.symbol || !h.name || !h.quantity || !h.averageCost);
      if (invalid.length > 0) {
        setError(`${invalid.length} holding(s) missing required fields. All holdings must have Symbol, Name, Quantity, and AverageCost.`);
        setLoading(false);
        return;
      }

      console.log('[ImportModal] Submitting batch import:', {
        portfolioId,
        holdingsCount: transformedData.length,
        sample: transformedData[0],
      });

      // Make SINGLE API call to batch add all holdings
      const response = await apiClient.post(
        `/api/portfolios/${portfolioId}/holdings/batch`,
        transformedData
      );

      const importedCount = response.data.data.importedCount;
      setSuccess(`✅ Successfully imported ${importedCount} holding${importedCount === 1 ? '' : 's'}!`);
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('[ImportModal] Batch import error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to import holdings';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Render mapping step
  const renderMappingStep = () => {
    const csvHeaders = Object.keys(parsedData[0] || {});
    const targetFields = ['symbol', 'name', 'quantity', 'averageCost', 'assetType', 'exchange', 'sector'];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Map CSV Columns</h3>
        <p className="text-sm text-gray-600">Select which CSV column corresponds to each field:</p>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {csvHeaders.map(header => (
            <div key={header} className="flex items-center gap-3">
              <label className="flex-1 text-sm font-medium text-gray-700 w-32">{header}</label>
              <select
                value={columnMapping[header] || ''}
                onChange={(e) => handleMappingChange(header, e.target.value)}
                className="flex-1 input-field"
              >
                <option value="">-- Skip --</option>
                {targetFields.map(field => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Preview:</strong> {parsedData.length} row{parsedData.length === 1 ? '' : 's'} will be imported
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Import Portfolio</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="csv-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                  <input
                    id="csv-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="csv-input" className="cursor-pointer">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                    <p className="text-gray-500 text-sm mt-1">CSV file required</p>
                    {fileName && <p className="text-blue-600 text-sm mt-2">📄 {fileName}</p>}
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>CSV Format:</strong> Your CSV should have columns like: Symbol, Name, Quantity, AverageCost, Exchange, Sector
                </p>
              </div>
            </div>
          )}

          {/* Step: Mapping */}
          {step === 'mapping' && renderMappingStep()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>

          {step === 'upload' && (
            <button
              onClick={handleParseCsv}
              disabled={!file || loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Parsing...' : 'Next: Map Columns'}
            </button>
          )}

          {step === 'mapping' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="btn-secondary"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Importing...' : 'Import All Holdings'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
