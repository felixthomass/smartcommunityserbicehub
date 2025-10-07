const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

export const chatService = {
  async createOrGetDmRoom(memberAuthUserIds, name = '') {
    const res = await fetch(`${API_BASE}/api/chat/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'dm', memberAuthUserIds, name })
    })
    if (!res.ok) throw new Error('Failed to create/get room')
    return res.json()
  },
  async createOrGetGroupRoom(name = 'Community', memberAuthUserIds = []) {
    const res = await fetch(`${API_BASE}/api/chat/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'group', memberAuthUserIds, name })
    })
    if (!res.ok) throw new Error('Failed to create/get group room')
    return res.json()
  },
  async listRooms(me) {
    const res = await fetch(`${API_BASE}/api/chat/rooms?me=${encodeURIComponent(me)}`)
    if (!res.ok) throw new Error('Failed to list rooms')
    return res.json()
  },
  async listMessages(roomId, before, limit = 30) {
    const url = new URL(`${API_BASE}/api/chat/messages`)
    url.searchParams.set('roomId', roomId)
    if (before) url.searchParams.set('before', before)
    url.searchParams.set('limit', String(limit))
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to list messages')
    return res.json()
  },
  async sendMessage(payload) {
    const res = await fetch(`${API_BASE}/api/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to send message')
    return res.json()
  },
  async sendFileMessage(roomId, senderAuthUserId, senderName, fileData, text = '') {
    const payload = {
      roomId,
      senderAuthUserId,
      senderName,
      text,
      media: {
        type: fileData.type,
        path: fileData.path,
        publicUrl: fileData.publicUrl,
        originalName: fileData.originalName,
        size: fileData.size,
        mimeType: fileData.mimeType
      }
    }
    return this.sendMessage(payload)
  },
  async editMessage(id, update) {
    const res = await fetch(`${API_BASE}/api/chat/messages/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    })
    if (!res.ok) throw new Error('Failed to edit message')
    return res.json()
  },
  async deleteMessage(id) {
    const res = await fetch(`${API_BASE}/api/chat/messages/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete message')
    return res.json()
  }
}


