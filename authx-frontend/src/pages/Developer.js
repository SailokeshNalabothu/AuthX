import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  getWebhooks,
  createWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookDeliveries
} from '../services/api';
import { toast } from 'react-toastify';

const ALL_SCOPES = [
  { id: 'read:profile', label: 'read:profile', desc: 'Read your profile identity and metadata' },
  { id: 'read:users', label: 'read:users', desc: 'Query directory of registered users' },
  { id: 'write:users', label: 'write:users', desc: 'Elevate roles or delete user accounts' },
  { id: 'read:sessions', label: 'read:sessions', desc: 'Inspect active multi-device sessions' },
  { id: 'write:sessions', label: 'write:sessions', desc: 'Revoke and terminate remote sessions' },
  { id: 'read:audit', label: 'read:audit', desc: 'Access security audit trail and forensics' }
];

const ALL_EVENTS = [
  { id: 'user.signup', label: 'user.signup', desc: 'Triggered when a new user registers' },
  { id: 'user.verified', label: 'user.verified', desc: 'Triggered when an email is activated' },
  { id: 'user.locked', label: 'user.locked', desc: 'Triggered on instant anomaly lockdown' },
  { id: 'user.unlocked', label: 'user.unlocked', desc: 'Triggered when account access is restored' },
  { id: 'user.deleted', label: 'user.deleted', desc: 'Triggered when an account is deleted' },
  { id: 'session.revoked', label: 'session.revoked', desc: 'Triggered when a session is terminated' }
];

const Developer = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('keys'); // 'keys', 'webhooks', 'guide'

  // API Keys State
  const [keys, setKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState(['read:profile']);
  const [keyExpiresInDays, setKeyExpiresInDays] = useState('90');
  const [createdRawKey, setCreatedRawKey] = useState(null);

  // Webhooks State
  const [webhooks, setWebhooks] = useState([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDesc, setWebhookDesc] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['user.signup', 'user.locked']);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState(null);

  // Webhook Deliveries Modal State
  const [showDeliveriesModal, setShowDeliveriesModal] = useState(false);
  const [activeWebhookDeliveries, setActiveWebhookDeliveries] = useState([]);
  const [activeWebhookUrl, setActiveWebhookUrl] = useState('');
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Test Ping State
  const [testingWebhookId, setTestingWebhookId] = useState(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoadingKeys(true);
      const res = await getApiKeys();
      setKeys(res.data.keys || []);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to load API keys");
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoadingWebhooks(true);
      const res = await getWebhooks();
      setWebhooks(res.data.webhooks || []);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to load webhooks");
    } finally {
      setLoadingWebhooks(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchWebhooks();
  }, [fetchKeys, fetchWebhooks]);

  // Handle Key Creation
  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key.");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error("Please select at least one permission scope.");
      return;
    }
    try {
      const res = await createApiKey({
        name: newKeyName,
        scopes: selectedScopes,
        expiresInDays: keyExpiresInDays === 'never' ? null : parseInt(keyExpiresInDays, 10)
      });
      setCreatedRawKey(res.data.apiKey);
      toast.success("API key generated successfully!");
      setNewKeyName('');
      setSelectedScopes(['read:profile']);
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to create API key");
    }
  };

  // Handle Key Revocation
  const handleRevokeKey = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this API key? Any applications using it will be denied access.")) {
      return;
    }
    try {
      await revokeApiKey(id);
      toast.info("API key revoked");
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to revoke API key");
    }
  };

  // Handle Key Deletion
  const handleDeleteKey = async (id) => {
    if (!window.confirm("Permanently delete this key record?")) return;
    try {
      await deleteApiKey(id);
      toast.success("API key deleted");
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to delete API key");
    }
  };

  // Handle Webhook Creation
  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !webhookUrl.startsWith('http')) {
      toast.error("Please enter a valid HTTP or HTTPS endpoint URL.");
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error("Please select at least one subscribed event.");
      return;
    }
    try {
      const res = await createWebhook({
        url: webhookUrl,
        description: webhookDesc,
        events: selectedEvents
      });
      setCreatedWebhookSecret(res.data.webhook);
      toast.success("Webhook endpoint registered!");
      setWebhookUrl('');
      setWebhookDesc('');
      fetchWebhooks();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to create webhook");
    }
  };

  // Handle Webhook Deletion
  const handleDeleteWebhook = async (id) => {
    if (!window.confirm("Delete this webhook endpoint and all its delivery logs?")) return;
    try {
      await deleteWebhook(id);
      toast.success("Webhook endpoint deleted");
      fetchWebhooks();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to delete webhook");
    }
  };

  // Handle Test Ping
  const handleTestPing = async (id) => {
    try {
      setTestingWebhookId(id);
      const res = await testWebhook(id);
      if (res.data.delivery?.status === 'SUCCESS') {
        toast.success(`Ping delivered! (HTTP ${res.data.delivery.statusCode} in ${res.data.delivery.durationMs}ms)`);
      } else {
        toast.warn(`Ping dispatched (Target returned HTTP ${res.data.delivery?.statusCode || 'Error'})`);
      }
      fetchWebhooks();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to dispatch test ping");
    } finally {
      setTestingWebhookId(null);
    }
  };

  // Handle View Deliveries
  const handleViewDeliveries = async (wh) => {
    try {
      setActiveWebhookUrl(wh.url);
      setLoadingDeliveries(true);
      setShowDeliveriesModal(true);
      const res = await getWebhookDeliveries(wh.id);
      setActiveWebhookDeliveries(res.data.deliveries || []);
    } catch (err) {
      toast.error("Failed to load delivery logs");
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>⚡</span>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#fff', margin: 0 }}>
                Developer Platform
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
                Manage Personal Access Tokens (API Keys) and signed Outbound Webhooks (Stripe / Supabase style).
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Active API Keys</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>
            {keys.filter(k => k.isActive && !k.isExpired).length}
          </div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Total keys: {keys.length}</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Webhook Endpoints</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>
            {webhooks.filter(w => w.isActive).length}
          </div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Subscribed destination URLs</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Signature Algorithm</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#a855f7', marginTop: '10px' }}>
            HMAC SHA-256
          </div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Header: <code>X-AuthX-Signature</code></div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('keys')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'keys' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'keys' ? '#38bdf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔑 Personal Access Tokens (API Keys)
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'webhooks' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'webhooks' ? '#10b981' : '#94a3b8',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔗 Outbound Webhooks
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'guide' ? '2px solid #a855f7' : '2px solid transparent',
            color: activeTab === 'guide' ? '#a855f7' : '#94a3b8',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📖 Integration & Verification Guide
        </button>
      </div>

      {/* ========================================================== */}
      {/* TAB 1: API KEYS / PERSONAL ACCESS TOKENS */}
      {/* ========================================================== */}
      {activeTab === 'keys' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#fff' }}>Scoped API Keys</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Authenticate external microservices or scripts via <code>Authorization: Bearer authx_live_sk_...</code> or <code>x-api-key</code>.
              </p>
            </div>
            <button
              onClick={() => { setCreatedRawKey(null); setShowKeyModal(true); }}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              + Create New API Key
            </button>
          </div>

          {/* Newly Created Key Alert Banner */}
          {createdRawKey && (
            <div style={{
              background: '#0f172a',
              border: '1px solid #38bdf8',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: '0 8px 24px rgba(56, 189, 248, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: '700', marginBottom: '6px' }}>
                <span>⚠️</span> Make sure to copy your API key now. You will not be able to see it again!
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px 0' }}>
                Key Name: <strong style={{ color: '#fff' }}>{createdRawKey.name}</strong> | Scopes: <code style={{ color: '#38bdf8' }}>{createdRawKey.scopes.join(', ')}</code>
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={createdRawKey.rawKey}
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#38bdf8'
                  }}
                />
                <button
                  onClick={() => copyToClipboard(createdRawKey.rawKey, "API Key")}
                  className="btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  📋 Copy Key
                </button>
                <button
                  onClick={() => setCreatedRawKey(null)}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Keys Table */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
            {loadingKeys ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading API keys...</div>
            ) : keys.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔑</div>
                <h4 style={{ color: '#fff', margin: '0 0 6px 0' }}>No API Keys Generated</h4>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>
                  Generate a Personal Access Token to connect your backend services to AuthX.
                </p>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="btn-primary"
                  style={{ display: 'inline-block' }}
                >
                  Generate Your First Key
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '14px 16px' }}>Name</th>
                    <th style={{ padding: '14px 16px' }}>Key Prefix</th>
                    <th style={{ padding: '14px 16px' }}>Scopes</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px' }}>Last Used</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} style={{ borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '600' }}>{k.name}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {k.keyPrefix}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {k.scopes.map(s => (
                            <span
                              key={s}
                              style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                fontFamily: 'monospace'
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {k.isExpired ? (
                          <span style={{ color: '#ef4444', fontWeight: '600' }}>Expired</span>
                        ) : k.isActive ? (
                          <span style={{ color: '#10b981', fontWeight: '600' }}>● Active</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Revoked</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {k.isActive && !k.isExpired && (
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Revoke
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            style={{
                              background: '#334155',
                              border: 'none',
                              color: '#94a3b8',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 2: OUTBOUND WEBHOOKS */}
      {/* ========================================================== */}
      {activeTab === 'webhooks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#fff' }}>Outbound Webhooks</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Receive signed JSON event notifications with <code>X-AuthX-Signature</code> (HMAC SHA-256) for security verification.
              </p>
            </div>
            <button
              onClick={() => { setCreatedWebhookSecret(null); setShowWebhookModal(true); }}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              + Add Webhook Endpoint
            </button>
          </div>

          {/* Newly Created Webhook Secret Alert Banner */}
          {createdWebhookSecret && (
            <div style={{
              background: '#0f172a',
              border: '1px solid #10b981',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '700', marginBottom: '6px' }}>
                <span>🔒</span> Webhook Signing Secret Generated
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px 0' }}>
                Endpoint: <strong style={{ color: '#fff' }}>{createdWebhookSecret.url}</strong>. Use this secret to cryptographically verify incoming payload signatures.
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={createdWebhookSecret.secret}
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#10b981'
                  }}
                />
                <button
                  onClick={() => copyToClipboard(createdWebhookSecret.secret, "Webhook Secret")}
                  className="btn-primary"
                  style={{ background: '#10b981', whiteSpace: 'nowrap' }}
                >
                  📋 Copy Secret
                </button>
                <button
                  onClick={() => setCreatedWebhookSecret(null)}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Webhooks Table */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
            {loadingWebhooks ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔗</div>
                <h4 style={{ color: '#fff', margin: '0 0 6px 0' }}>No Webhook Endpoints Configured</h4>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>
                  Register a destination URL to receive live event payloads like <code>user.signup</code> and <code>user.locked</code>.
                </p>
                <button
                  onClick={() => setShowWebhookModal(true)}
                  className="btn-primary"
                  style={{ display: 'inline-block', background: '#10b981' }}
                >
                  Register Webhook
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '14px 16px' }}>Endpoint URL</th>
                    <th style={{ padding: '14px 16px' }}>Subscribed Events</th>
                    <th style={{ padding: '14px 16px' }}>Secret</th>
                    <th style={{ padding: '14px 16px' }}>Deliveries</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((wh) => (
                    <tr key={wh.id} style={{ borderBottom: '1px solid #334155', color: '#e2e8f0' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{wh.url}</div>
                        {wh.description && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{wh.description}</div>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {wh.events.map(e => (
                            <span
                              key={e}
                              style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                fontFamily: 'monospace'
                              }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {wh.secretPreview}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: wh.lastDeliveryStatus === 'SUCCESS' ? 'rgba(16, 185, 129, 0.2)' : wh.lastDeliveryStatus === 'FAILED' ? 'rgba(239, 68, 68, 0.2)' : '#334155',
                          color: wh.lastDeliveryStatus === 'SUCCESS' ? '#34d399' : wh.lastDeliveryStatus === 'FAILED' ? '#f87171' : '#94a3b8',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          {wh.totalDeliveries} calls ({wh.lastDeliveryStatus})
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleTestPing(wh.id)}
                            disabled={testingWebhookId === wh.id}
                            style={{
                              background: '#0284c7',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            {testingWebhookId === wh.id ? 'Pinging...' : '⚡ Test Ping'}
                          </button>
                          <button
                            onClick={() => handleViewDeliveries(wh)}
                            style={{
                              background: '#334155',
                              border: 'none',
                              color: '#e2e8f0',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            📜 Logs
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 3: INTEGRATION & VERIFICATION GUIDE */}
      {/* ========================================================== */}
      {activeTab === 'guide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* API Key Usage Guide */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ color: '#38bdf8', fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0' }}>
              🔑 Using Scoped API Keys in Your Backend
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              Pass your API key using the standard <code>Authorization: Bearer &lt;key&gt;</code> header or the custom <code>x-api-key: &lt;key&gt;</code> header.
            </p>
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px', overflowX: 'auto' }}>
              <pre style={{ margin: 0, color: '#38bdf8', fontFamily: 'monospace', fontSize: '13px' }}>
{`# 1. Fetch Profile (Scope: read:profile)
curl -X GET http://localhost:5000/api/developer/v1/profile \\
  -H "Authorization: Bearer authx_live_sk_YOUR_KEY_HERE"

# 2. Query Organization Users (Scope: read:users)
curl -X GET http://localhost:5000/api/developer/v1/users \\
  -H "x-api-key: authx_live_sk_YOUR_KEY_HERE"`}
              </pre>
            </div>
          </div>

          {/* Webhook Signature Verification Guide */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ color: '#10b981', fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0' }}>
              🔒 Cryptographically Verifying Outbound Webhook Signatures
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              Every webhook sent by AuthX includes an <code>X-AuthX-Signature</code> header computed with HMAC SHA-256. Verify this signature to ensure payloads originate from AuthX and have not been tampered with.
            </p>
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px', overflowX: 'auto' }}>
              <pre style={{ margin: 0, color: '#34d399', fontFamily: 'monospace', fontSize: '13px' }}>
{`// Express.js Webhook Receiver Verification Handler
const crypto = require('crypto');

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signatureHeader = req.headers['x-authx-signature'];
  const rawBody = req.body.toString('utf-8');
  const secret = process.env.AUTHX_WEBHOOK_SECRET; // e.g. whsec_...

  // Extract timestamp and signature: t=1793026000,v1=abcdef...
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
  const signature = parts.find(p => p.startsWith('v1=')).split('=')[1];

  // Compute expected HMAC SHA-256
  const signedPayload = \`\${timestamp}.\${rawBody}\`;
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );

  if (!isValid) {
    return res.status(401).send("Invalid webhook signature");
  }

  const event = JSON.parse(rawBody);
  console.log("Verified AuthX Event:", event.event, event.data);
  res.status(200).json({ received: true });
});`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 1: CREATE API KEY */}
      {/* ========================================================== */}
      {showKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '20px', fontWeight: '700' }}>
              Create Scoped API Key
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>
              Select specific permissions. The raw key is hashed and cannot be retrieved later.
            </p>

            <form onSubmit={handleCreateKey}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Key Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production Backend, GitHub Actions CI"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Expiration
                </label>
                <select
                  value={keyExpiresInDays}
                  onChange={(e) => setKeyExpiresInDays(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="365">1 Year (365 Days)</option>
                  <option value="never">No Expiration (Permanent)</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Permission Scopes
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {ALL_SCOPES.map(s => {
                    const checked = selectedScopes.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          background: checked ? 'rgba(56, 189, 248, 0.08)' : '#0f172a',
                          border: `1px solid ${checked ? '#38bdf8' : '#334155'}`,
                          borderRadius: '8px',
                          padding: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, s.id]);
                            } else {
                              setSelectedScopes(selectedScopes.filter(id => id !== s.id));
                            }
                          }}
                          style={{ marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: '700', color: checked ? '#38bdf8' : '#e2e8f0', fontSize: '13px' }}>
                            {s.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' }}
                >
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 2: REGISTER WEBHOOK */}
      {/* ========================================================== */}
      {showWebhookModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '20px', fontWeight: '700' }}>
              Register Webhook Endpoint
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 20px 0' }}>
              AuthX will dispatch signed HTTP POST requests whenever matching identity events occur.
            </p>

            <form onSubmit={handleCreateWebhook}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Destination URL
                </label>
                <input
                  type="url"
                  placeholder="https://api.yourdomain.com/authx-webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Slack Alert Bot, Billing Sync Engine"
                  value={webhookDesc}
                  onChange={(e) => setWebhookDesc(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Subscribed Event Triggers
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {ALL_EVENTS.map(ev => {
                    const checked = selectedEvents.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          background: checked ? 'rgba(16, 185, 129, 0.08)' : '#0f172a',
                          border: `1px solid ${checked ? '#10b981' : '#334155'}`,
                          borderRadius: '8px',
                          padding: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvents([...selectedEvents, ev.id]);
                            } else {
                              setSelectedEvents(selectedEvents.filter(id => id !== ev.id));
                            }
                          }}
                          style={{ marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: '700', color: checked ? '#10b981' : '#e2e8f0', fontSize: '13px' }}>
                            {ev.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ev.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  Register Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: WEBHOOK DELIVERIES LOG */}
      {/* ========================================================== */}
      {showDeliveriesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '700' }}>
                  📜 Webhook Delivery Logs
                </h3>
                <button
                  onClick={() => setShowDeliveriesModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0 0', wordBreak: 'break-all' }}>
                Target: {activeWebhookUrl}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {loadingDeliveries ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Loading delivery logs...</div>
              ) : activeWebhookDeliveries.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                  No deliveries recorded yet. Click "⚡ Test Ping" to send a sample event!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeWebhookDeliveries.map((del) => (
                    <div
                      key={del._id}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px 16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: del.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: del.status === 'SUCCESS' ? '#34d399' : '#f87171',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {del.statusCode || 'ERR'}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#fff', fontSize: '13px' }}>
                            {del.event}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {del.durationMs}ms · {new Date(del.deliveredAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '6px' }}>
                        Signature: {del.signature}
                      </div>

                      <div style={{ background: '#1e293b', borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'monospace', color: '#cbd5e1', overflowX: 'auto' }}>
                        {JSON.stringify(del.payload?.data || del.payload, null, 2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #334155', textAlign: 'right' }}>
              <button
                onClick={() => setShowDeliveriesModal(false)}
                className="btn-primary"
                style={{ background: '#334155' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Developer;
