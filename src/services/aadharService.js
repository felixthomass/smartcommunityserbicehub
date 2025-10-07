import { supabase } from '../lib/supabase'

const BUCKET = 'resident-documents'

export const aadharService = {
  async uploadAadhar(file, residentId) {
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${residentId || 'unknown'}_aadhar_${Date.now()}.${ext}`
      const path = `aadhar/${fileName}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: true })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      return { success: true, data: { path, publicUrl: data.publicUrl } }
    } catch (e) {
      return { success: false, error: e.message }
    }
  },

  async extractAadharDataFromImage(fileOrUrl) {
    try {
      const Tesseract = (await import('tesseract.js')).default
      const image = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl)
      const { data: { text } } = await Tesseract.recognize(image, 'eng')

      const digits = (text.match(/\b\d{4}\s\d{4}\s\d{4}\b/) || [])[0] || ''
      const nameMatch = text.split('\n').map(s=>s.trim()).find(s => /^[A-Z][A-Za-z\s]{2,}$/.test(s)) || ''
      const dobMatch = (text.match(/\b(\d{2}[\/.-]\d{2}[\/.-]\d{4})\b/i) || [])[1] || ''
      return { success: true, data: { aadharNumber: digits.replace(/\s/g,'') || '', name: nameMatch || '', dob: dobMatch || '' } }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }
}



