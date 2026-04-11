import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function ApiKeysPage() {
  const { data: session, status } = useSession()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newKeyPlain, setNewKeyPlain] = useState(null)
  const [pasteKey, setPasteKey] = useState('')
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchKeys()
  }, [status])

  async function fetchKeys() {
    setLoading(true)
    const query = `query MyKeys { userApiKeys { id name provider createdAt revoked lastUsedAt updatedAt } }`
    const res = await fetch('/api/graphql', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
    if (res.ok) {
      const body = await res.json()
      setKeys(body.data?.userApiKeys || [])
    }
    setLoading(false)
  }

  async function createKey() {
    if (!pasteKey) return alert('Paste your OpenAI key into the input')
    setCreating(true)
    setNewKeyPlain(null)
    const mutation = `mutation CreateKey($provider:String!, $key:String!, $name:String){ createUserApiKey(provider:$provider, key:$key, name:$name){ id name provider createdAt } }`
    const res = await fetch('/api/graphql', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: mutation, variables: { provider: 'openai', key: pasteKey, name: nameInput } }) })
    if (res.ok) {
      const body = await res.json()
      if (body.errors) {
        alert('Error: ' + body.errors[0].message)
      } else {
        setNewKeyPlain('Stored')
        setPasteKey('')
        setNameInput('')
        fetchKeys()
      }
    } else {
      const err = await res.text()
      alert('Error: ' + err)
    }
    setCreating(false)
  }

  if (status === 'loading') return <div>Checking session...</div>
  if (!session?.user) return <div>Please <Link href="/auth/signin">sign in</Link>.</div>

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '48px auto' }}>
      <h1>API keys</h1>
      <p>Manage your personal API keys for LLM providers.</p>

      <div style={{ margin: '16px 0' }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Paste your OpenAI key</label>
          <input value={pasteKey} onChange={e => setPasteKey(e.target.value)} style={{ width: '100%', padding: 8 }} placeholder="sk-..." />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Name (optional)</label>
          <input value={nameInput} onChange={e => setNameInput(e.target.value)} style={{ width: '100%', padding: 8 }} placeholder="My personal OpenAI key" />
        </div>
        <button onClick={createKey} disabled={creating}>
          {creating ? 'Saving…' : 'Save key'}
        </button>
      </div>

      {newKeyPlain ? (
        <div style={{ border: '1px solid #e2d5c3', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <strong>Key stored</strong>
          <div style={{ marginTop: 8 }}>{newKeyPlain}</div>
        </div>
      ) : null}

      <h2>Your keys</h2>
      {loading ? <div>Loading…</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Provider</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Created</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
                      <tr key={k._id}>
                <td style={{ padding: 8 }}>{k.name}</td>
                <td style={{ padding: 8 }}>{k.provider}</td>
                <td style={{ padding: 8 }}>{new Date(k.createdAt).toLocaleString()}</td>
                <td style={{ padding: 8 }}>
                          <button onClick={async () => { if (confirm('Revoke key?')) {
                              const mutation = `mutation Revoke($id:ID!){ revokeUserApiKey(id:$id) }`
                              await fetch('/api/graphql', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: mutation, variables: { id: k._id } }) })
                              fetchKeys()
                            } }}>Revoke</button>
                </td>
                      </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
