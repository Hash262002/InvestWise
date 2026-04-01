import { useState } from 'react'
import { parseCSVFile, importHoldingsToPortfolio, downloadCSVTemplate, CSVHolding } from '@/services/csvService'
import { useUIStore } from '@/stores/uiStore'

interface ImportCSVModalProps {
  portfolioId: string
  onSuccess?: () => void
}

export const ImportCSVModal = ({ portfolioId, onSuccess }: ImportCSVModalProps) => {
  const isOpen = useUIStore((state) => state.modals.addHolding)
  const toggleModal = useUIStore((state) => state.toggleAddHoldingModal)
  
  const [file, setFile] = useState<File | null>(null)
  const [holdings, setHoldings] = useState<CSVHolding[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replaceMode, setReplaceMode] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleParse = async () => {
    if (!file) {
      setError('Please select a CSV file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parsedHoldings = await parseCSVFile(file)
      setHoldings(parsedHoldings)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    setStep('importing')
    setLoading(true)
    setError(null)

    try {
      await importHoldingsToPortfolio(portfolioId, holdings, replaceMode)
      
      // Reset and close
      setFile(null)
      setHoldings([])
      setStep('upload')
      setReplaceMode(false)
      toggleModal()
      
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import holdings')
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setHoldings([])
    setError(null)
    setStep('upload')
    setReplaceMode(false)
    toggleModal()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Import Holdings from CSV</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center gap-4 text-sm">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              step === 'upload' || step === 'preview' || step === 'importing' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-300 text-gray-700'
            }`}>
              1
            </div>
            <span className="text-gray-600">Select File</span>
            
            <div className={`h-0.5 flex-1 ${
              step === 'preview' || step === 'importing' ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
            
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              step === 'preview' || step === 'importing'
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-300 text-gray-700'
            }`}>
              2
            </div>
            <span className="text-gray-600">Preview</span>
            
            <div className={`h-0.5 flex-1 ${
              step === 'importing' ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
            
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              step === 'importing'
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-300 text-gray-700'
            }`}>
              3
            </div>
            <span className="text-gray-600">Import</span>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-input"
                  disabled={loading}
                />
                <label htmlFor="csv-input" className="cursor-pointer">
                  <div className="text-gray-600">
                    <p className="text-lg font-medium mb-1">Select a CSV file</p>
                    <p className="text-sm text-gray-500">or drag and drop</p>
                    {file && <p className="text-sm text-blue-600 mt-2">Selected: {file.name}</p>}
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Required CSV columns:</p>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                  <code>symbol, name, quantity, averageCost</code>
                </div>
                <p className="text-xs text-gray-500">
                  Optional: exchange, sector, assetType
                </p>
              </div>

              <button
                onClick={downloadCSVTemplate}
                className="w-full px-4 py-2 text-blue-600 hover:text-blue-700 border border-blue-600 hover:border-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                Download CSV Template
              </button>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && holdings.length > 0 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  Found {holdings.length} holding(s) to import
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Symbol</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">Quantity</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">Avg Cost</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{holding.symbol}</td>
                        <td className="px-4 py-2 text-gray-600">{holding.name}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{holding.quantity}</td>
                        <td className="px-4 py-2 text-right text-gray-600">₹{Number(holding.averageCost).toFixed(2)}</td>
                        <td className="px-4 py-2 text-gray-600">{holding.assetType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="replace-mode"
                    checked={replaceMode}
                    onChange={(e) => setReplaceMode(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="replace-mode" className="text-sm text-yellow-900">
                    <span className="font-medium">Replace all holdings</span> - If unchecked, new holdings will be merged with existing ones (quantities will be added for matching symbols)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Importing holdings...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="btn btn-secondary flex-1"
            disabled={loading}
          >
            Close
          </button>
          
          {step === 'upload' && (
            <button
              onClick={handleParse}
              className="btn btn-primary flex-1"
              disabled={!file || loading}
            >
              {loading ? 'Parsing...' : 'Next'}
            </button>
          )}
          
          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setFile(null)
                  setHoldings([])
                  setStep('upload')
                }}
                className="btn btn-secondary flex-1"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Importing...' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
