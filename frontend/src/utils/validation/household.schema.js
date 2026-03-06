export const householdSchema = {
  requiredHeaders: ['household_id', 'members'],

  validateRow(row) {
    if (!/^\d+$/.test(row.household_id)) {
      return 'household_id must be numeric'
    }

    const members = Number(row.members)
    if (!Number.isInteger(members) || members <= 0) {
      return 'members must be a positive integer'
    }

    return null
  },
}
