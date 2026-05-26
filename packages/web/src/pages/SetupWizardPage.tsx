import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

type Step = 'org' | 'quarry' | 'done';

const ORG_BLANK = { orgName: '', pan: '', gstin: '', contactEmail: '', contactPhone: '', registeredAddress: '' };
const QUARRY_BLANK = { quarryName: '', quarryCode: '', quarryType: 'opencast', district: '', state: 'Tamil Nadu', village: '', taluk: '', gstin: '', dgmsRegistrationNo: '', ibmCode: '' };

const STEPS: Step[] = ['org', 'quarry', 'done'];
const STEP_LABELS = ['Company Info', 'Primary Quarry', 'Done'];

export default function SetupWizardPage() {
  const { notify } = useToastStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('org');
  const [org, setOrg] = useState(ORG_BLANK);
  const [quarry, setQuarry] = useState(QUARRY_BLANK);
  const [saving, setSaving] = useState(false);

  const fo = (k: string) => (e: any) => setOrg(p => ({ ...p, [k]: e.target.value }));
  const fq = (k: string) => (e: any) => setQuarry(p => ({ ...p, [k]: e.target.value }));

  const saveOrg = async () => {
    if (!org.orgName) { notify('Company name is required', 'error'); return; }
    setSaving(true);
    try {
      await apiClient.updateOrg({ orgName: org.orgName, pan: org.pan, gstin: org.gstin, contactEmail: org.contactEmail, contactPhone: org.contactPhone, registeredAddress: org.registeredAddress });
      setStep('quarry');
    } catch (err: any) {
      notify(err?.message || 'Failed to save company info', 'error');
    } finally { setSaving(false); }
  };

  const saveQuarry = async () => {
    if (!quarry.quarryName || !quarry.quarryCode) { notify('Quarry name and code are required', 'error'); return; }
    setSaving(true);
    try {
      const created = await apiClient.createQuarry({ ...quarry, operationalStatus: 'active' });
      // Set as default (first quarry — but migration already handles this)
      if (created?.id) {
        try { await apiClient.setDefaultQuarry(created.id); } catch { /* ok */ }
      }
      setStep('done');
    } catch (err: any) {
      notify(err?.message || 'Failed to create quarry', 'error');
    } finally { setSaving(false); }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏔️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Welcome — Let's get started</div>
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>Complete the setup to configure your ERP for your company and quarry.</div>
        </div>

        {/* Step bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--bdr)' }}>
          {STEP_LABELS.map((lbl, i) => (
            <div key={lbl} style={{
              flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: i === stepIndex ? 700 : 400,
              background: i === stepIndex ? 'var(--accent)' : i < stepIndex ? 'var(--accent2)' : 'var(--card)',
              color: i <= stepIndex ? '#fff' : 'var(--t3)',
              borderRight: i < 2 ? '1px solid var(--bdr)' : 'none',
              transition: 'background 0.2s',
            }}>
              {i < stepIndex ? '✓ ' : ''}{lbl}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* ── Step 1: Org ── */}
          {step === 'org' && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--t1)' }}>Step 1 — Company Information</div>
              <div className="fg"><label className="fl">Company / Org Name *</label><input className="fi" value={org.orgName} onChange={fo('orgName')} placeholder="Vatsin Granites Pvt Ltd" /></div>
              <div className="fg2" style={{ marginTop: 12 }}>
                <div className="fg"><label className="fl">PAN</label><input className="fi" value={org.pan} onChange={fo('pan')} placeholder="AABCA1234B" /></div>
                <div className="fg"><label className="fl">GSTIN</label><input className="fi" value={org.gstin} onChange={fo('gstin')} placeholder="33AABCA1234B1Z5" /></div>
              </div>
              <div className="fg2" style={{ marginTop: 12 }}>
                <div className="fg"><label className="fl">Contact Email</label><input className="fi" type="email" value={org.contactEmail} onChange={fo('contactEmail')} placeholder="info@vatsingranites.in" /></div>
                <div className="fg"><label className="fl">Phone</label><input className="fi" value={org.contactPhone} onChange={fo('contactPhone')} placeholder="+91 98765 43210" /></div>
              </div>
              <div className="fg" style={{ marginTop: 12 }}>
                <label className="fl">Registered Address</label>
                <input className="fi" value={org.registeredAddress} onChange={fo('registeredAddress')} placeholder="123, Industrial Area, Krishnagiri - 635001" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button className="btn btn-p" onClick={saveOrg} disabled={saving}>{saving ? 'Saving…' : 'Next →'}</button>
              </div>
            </>
          )}

          {/* ── Step 2: Quarry ── */}
          {step === 'quarry' && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--t1)' }}>Step 2 — Primary Quarry</div>
              <div className="fg2">
                <div className="fg"><label className="fl">Quarry Name *</label><input className="fi" value={quarry.quarryName} onChange={fq('quarryName')} placeholder="Vatsin Granite Quarry" /></div>
                <div className="fg"><label className="fl">Quarry Code *</label><input className="fi" value={quarry.quarryCode} onChange={fq('quarryCode')} placeholder="ABG001" /></div>
              </div>
              <div className="fg2" style={{ marginTop: 12 }}>
                <div className="fg"><label className="fl">District</label><input className="fi" value={quarry.district} onChange={fq('district')} placeholder="Krishnagiri" /></div>
                <div className="fg"><label className="fl">State</label><input className="fi" value={quarry.state} onChange={fq('state')} placeholder="Tamil Nadu" /></div>
              </div>
              <div className="fg2" style={{ marginTop: 12 }}>
                <div className="fg"><label className="fl">Village</label><input className="fi" value={quarry.village} onChange={fq('village')} placeholder="Village name" /></div>
                <div className="fg"><label className="fl">Taluk</label><input className="fi" value={quarry.taluk} onChange={fq('taluk')} placeholder="Taluk name" /></div>
              </div>
              <div className="fg2" style={{ marginTop: 12 }}>
                <div className="fg"><label className="fl">GSTIN</label><input className="fi" value={quarry.gstin} onChange={fq('gstin')} placeholder="33AABCA1234B1Z5" /></div>
                <div className="fg"><label className="fl">Type</label>
                  <select className="fsel" value={quarry.quarryType} onChange={fq('quarryType')}>
                    <option value="opencast">Opencast</option>
                    <option value="underground">Underground</option>
                    <option value="wire_saw">Wire Saw</option>
                  </select>
                </div>
              </div>
              <div className="fg2" style={{ marginTop: 12 }}>
                <div className="fg"><label className="fl">DGMS Reg. No.</label><input className="fi" value={quarry.dgmsRegistrationNo} onChange={fq('dgmsRegistrationNo')} placeholder="DGMS/TN/XXX" /></div>
                <div className="fg"><label className="fl">IBM Code</label><input className="fi" value={quarry.ibmCode} onChange={fq('ibmCode')} placeholder="IBM/TN/XX/XXX" /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button className="btn btn-s" onClick={() => setStep('org')} disabled={saving}>← Back</button>
                <button className="btn btn-p" onClick={saveQuarry} disabled={saving}>{saving ? 'Creating…' : 'Create Quarry →'}</button>
              </div>
            </>
          )}

          {/* ── Step 3: Done ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>Setup Complete!</div>
              <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 28 }}>
                Your ERP is configured. You can add more quarries, employees, and customers from the respective pages.
              </div>
              <button className="btn btn-p" style={{ padding: '10px 32px', fontSize: 14 }} onClick={() => navigate('/dashboard')}>
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--t3)' }}>
          You can update company details anytime from System → Masters.
        </div>
      </div>
    </div>
  );
}
