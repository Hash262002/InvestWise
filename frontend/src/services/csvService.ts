import apiClient from './api'

export interface CSVHolding {
  symbol: string
  name: string
  quantity: string | number
  averageCost: string | number
  exchange?: string
  sector?: string
  assetType?: string
}

/**
 * Parse CSV file and return holdings data
 */
export const parseCSVFile = async (file: File): Promise<CSVHolding[]> => {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain headers and at least one data row')
  }

  const headerLine = lines[0]
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase())

  // Required fields
  const requiredFields = ['symbol', 'name', 'quantity', 'averagecost']
  const missingFields = requiredFields.filter(field => !headers.includes(field))
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }

  const holdings: CSVHolding[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    
    if (values.length < requiredFields.length) {
      continue // Skip incomplete rows
    }

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    if (row.symbol && row.name && row.quantity && row.averagecost) {
      holdings.push({
        symbol: row.symbol,
        name: row.name,
        quantity: parseFloat(row.quantity as string) || 0,
        averageCost: parseFloat(row.averagecost as string) || 0,
        exchange: row.exchange || '',
        sector: row.sector || '',
        assetType: row.assettype || 'stock',
      })
    }
  }

  if (holdings.length === 0) {
    throw new Error('No valid holdings found in CSV')
  }

  return holdings
}

/**
 * Import holdings to portfolio
 */
export const importHoldingsToPortfolio = async (
  portfolioId: string,
  holdings: CSVHolding[],
  replace: boolean = false
): Promise<any> => {
  const response = await apiClient.post(
    `/portfolios/${portfolioId}/import`,
    {
      holdings: holdings.map(h => ({
        symbol: h.symbol.toUpperCase(),
        name: h.name,
        quantity: h.quantity,
        averageCost: h.averageCost,
        exchange: h.exchange || '',
        sector: h.sector || '',
        assetType: h.assetType || 'stock',
      })),
    },
    {
      params: replace ? { replace: 'true' } : {}
    }
  )

  return response.data
}

/**
 * Generate CSV template content
 */
export const generateCSVTemplate = (): string => {
  const headers = ['symbol', 'name', 'quantity', 'averageCost', 'exchange', 'sector', 'assetType']
  const sampleRow = ['RELIANCE', 'Reliance Industries', '10', '2000', 'NSE', 'Energy', 'stock']
  
  return [headers.join(','), sampleRow.join(',')].join('\n')
}

/**
 * Download CSV template
 */
export const downloadCSVTemplate = () => {
  const csv = generateCSVTemplate()
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'holdings_template.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
