export const personsSchema = {
  requiredHeaders: ['id', 'name', 'age', 'gender'],

  validateRow(row) {
    if (!/^\d+$/.test(row.id)) {
      return 'id must be a number'
    }

    if (!row.name || row.name.trim() === '') {
      return 'name cannot be empty'
    }

    const age = Number(row.age)
    if (!Number.isInteger(age) || age <= 0 || age > 120) {
      return 'age must be between 1 and 120'
    }

    if (!['M', 'F', 'O'].includes(row.gender)) {
      return 'gender must be M, F, or O'
    }

    return null // valid row
  },
}
