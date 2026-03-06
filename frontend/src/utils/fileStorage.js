const STORAGE_KEY = 'btp_profiles'
const DB_NAME = 'BTP_Files'
const DB_VERSION = 1
const STORE_NAME = 'files'

export const getProfiles = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export const saveProfiles = (profiles) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

export const createProfileFolder = (profileName, id = null) => {
  const profiles = getProfiles()
  const profileId = id || `profile_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

  const newProfile = {
    id: profileId,
    name: profileName,
    createdAt: new Date().toISOString(),
  }

  profiles.push(newProfile)
  saveProfiles(profiles)

  const profileFilesKey = `profile_files_${profileId}`
  localStorage.setItem(profileFilesKey, JSON.stringify([]))

  return profileId
}

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export const saveFilesToProfile = async (profileId, files) => {
  const profileFilesKey = `profile_files_${profileId}`
  const fileList = []

  for (const [key, file] of Object.entries(files)) {
    fileList.push({
      key,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    })

    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const addRequest = store.add({
          profileId,
          fileKey: key,
          fileName: file.name,
          fileContent: e.target.result,
          uploadedAt: new Date().toISOString(),
        })
        addRequest.onsuccess = () => resolve()
        addRequest.onerror = () => reject(addRequest.error)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })

    db.close()
  }

  localStorage.setItem(profileFilesKey, JSON.stringify(fileList))
}

export const getProfileFiles = (profileId) => {
  const profileFilesKey = `profile_files_${profileId}`
  try {
    const stored = localStorage.getItem(profileFilesKey)
    if (!stored) return []
    const fileList = JSON.parse(stored)
    return fileList.map((f) => f.name)
  } catch {
    return []
  }
}

export const deleteProfile = (profileId) => {
  const profiles = getProfiles()
  const filtered = profiles.filter((p) => p.id !== profileId)
  saveProfiles(filtered)
  const profileFilesKey = `profile_files_${profileId}`
  localStorage.removeItem(profileFilesKey)
}
