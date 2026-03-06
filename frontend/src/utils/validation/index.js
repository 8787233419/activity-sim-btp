import { SCHEMAS } from './schemas'

export async function validateCSVFile(file, fileKey) {
  const schema = SCHEMAS[fileKey]

  // If no schema defined, skip validation
  if (!schema) {
    return { isValid: true, message: 'No validation schema defined' }
  }

  try {
    const text = await file.text()
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      return {
        isValid: false,
        message: 'CSV file contains no data rows',
      }
    }

    const headers = lines[0].split(',').map((h) => h.trim())

    // 1️⃣ Header validation
    for (const required of schema.requiredHeaders) {
      if (!headers.includes(required)) {
        return {
          isValid: false,
          message: `Missing required column: ${required}`,
        }
      }
    }

    // 2️⃣ Row-by-row validation
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const row = {}

      headers.forEach((h, idx) => {
        row[h] = values[idx]?.trim()
      })

      const error = schema.validateRow(row)
      if (error) {
        return {
          isValid: false,
          message: `Row ${i + 1}: ${error}`,
        }
      }
    }

    return {
      isValid: true,
      message: 'File format is valid',
    }
  } catch (err) {
    return {
      isValid: false,
      message: 'Failed to read CSV file',
    }
  }
}
