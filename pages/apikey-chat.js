import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function ApiKeyChatPage() {
  const { data: session, status } = useSession()
  const [keys, setKeys] = useState([])
  const [selected, setSelected] = useState('')
  const [prompt, setPrompt] = useState('')
  const [reply, setReply] = useState(null)
  const [messages, setMessages] = useState([]) // {role, content}
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchKeys()
  }, [status])

  async function fetchKeys() {
    const query = `query { userApiKeys { id name provider createdAt revoked lastUsedAt } }`
    const res = await fetch('/api/graphql', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
    if (res.ok) {
      const body = await res.json()
      setKeys(body.data?.userApiKeys || [])
      if ((body.data?.userApiKeys || []).length > 0) setSelected(body.data.userApiKeys[0].id)
    }
  }

  async function sendPrompt() {
    if (!selected) return alert('Select a key')
    if (!prompt) return alert('Write a prompt')
    setLoading(true)
    setReply(null)

    const userMsg = { role: 'user', content: prompt }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    const mutation = `mutation Call($keyId:ID!, $messages:[ChatMessageInput!]!){ callUserApiKeyChat(keyId:$keyId, messages:$messages) }`
    const res = await fetch('/api/graphql', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: mutation, variables: { keyId: selected, messages: newMessages } }) })
    const body = await res.json()
    if (body.errors) {
      setReply('Error: ' + body.errors[0].message)
    } else {
      const assistant = { role: 'assistant', content: body.data.callUserApiKeyChat }
      setMessages(prev => [...prev, assistant])
      setReply(body.data.callUserApiKeyChat)
      setPrompt('')
    }
    setLoading(false)
  }

  if (status === 'loading') return <div>Checking session...</div>
  if (!session?.user) return <div>Please <Link href="/auth/signin">sign in</Link>.</div>

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '48px auto' }}>
      <h1>Chat with your API key</h1>
      <p>Select one of your stored API keys and send a prompt to the LLM.</p>

      <div style={{ margin: '16px 0' }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Choose key</label>
        <select value={selected} onChange={e => setSelected(e.target.value)} style={{ width: '100%', padding: 8 }}>
          {keys.map(k => (<option key={k.id} value={k.id}>{k.name} — {k.provider}</option>))}
        </select>
      </div>

      <div style={{ margin: '16px 0' }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Prompt</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} />
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Conversation</strong>
        <div style={{ marginTop: 8, maxHeight: 320, overflow: 'auto', border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
          {messages.length === 0 ? <div style={{ color: '#666' }}>No messages yet.</div> : messages.map((m, idx) => (
            <div key={idx} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#888' }}>{m.role}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button onClick={sendPrompt} disabled={loading}>{loading ? 'Sending…' : 'Send'}</button>
      </div>

      {reply !== null ? (
        <div style={{ whiteSpace: 'pre-wrap', marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>{reply}</div>
      ) : null}
    </div>
  )
}
