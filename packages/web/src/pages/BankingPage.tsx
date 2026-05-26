import { useState } from 'react';
import { useToastStore } from '../store';

const AC_TYPES = ['Current', 'Savings', 'Cash Credit', 'OD'];
const BLANK_AC = { bank: '', branch: '', acno: '', type: 'Current', balance: '', cc_limit: '', cc_used: '' };
const BLANK_LOAN = { ref: '', bank: '', purpose: '', sanction: '', outstanding: '', emi: '', next_due: new Date().toISOString().slice(0, 10), rate: '' };

export default function BankingPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'accounts' | 'loans' | 'recon'>('accounts');

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);

  const [showACModal, setShowACModal] = useState(false);
  const [acForm, setACForm] = useState<any>(BLANK_AC);
  const [editACId, setEditACId] = useState<number | null>(null);

  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState<any>(BLANK_LOAN);
  const [editLoanId, setEditLoanId] = useState<number | null>(null);

  const nextACId = () => (bankAccounts.length === 0 ? 1 : Math.max(...bankAccounts.map(a => a.id)) + 1);
  const nextLoanId = () => (loans.length === 0 ? 1 : Math.max(...loans.map(l => l.id)) + 1);

  const openAddAC = () => { setACForm(BLANK_AC); setEditACId(null); setShowACModal(true); };
  const openEditAC = (a: any) => { setACForm({ ...a, balance: String(a.balance), cc_limit: String(a.cc_limit || ''), cc_used: String(a.cc_used || '') }); setEditACId(a.id); setShowACModal(true); };

  const handleSaveAC = () => {
    if (!acForm.bank || !acForm.acno) { notify('Bank and account number are required', 'error'); return; }
    const rec = { ...acForm, balance: Number(acForm.balance) || 0, cc_limit: Number(acForm.cc_limit) || 0, cc_used: Number(acForm.cc_used) || 0 };
    if (editACId !== null) {
      setBankAccounts(prev => prev.map(a => a.id === editACId ? { ...a, ...rec } : a));
      notify('Account updated');
    } else {
      setBankAccounts(prev => [...prev, { ...rec, id: nextACId() }]);
      notify('Account added');
    }
    setShowACModal(false);
  };

  const handleDeleteAC = (id: number) => { setBankAccounts(prev => prev.filter(a => a.id !== id)); notify('Account deleted'); };

  const openAddLoan = () => { setLoanForm({ ...BLANK_LOAN, ref: `LOAN-${String(nextLoanId()).padStart(3, '0')}` }); setEditLoanId(null); setShowLoanModal(true); };
  const openEditLoan = (l: any) => { setLoanForm({ ...l, sanction: String(l.sanction), outstanding: String(l.outstanding), emi: String(l.emi), rate: String(l.rate) }); setEditLoanId(l.id); setShowLoanModal(true); };

  const handleSaveLoan = () => {
    if (!loanForm.bank || !loanForm.purpose) { notify('Bank and purpose are required', 'error'); return; }
    const rec = { ...loanForm, sanction: Number(loanForm.sanction) || 0, outstanding: Number(loanForm.outstanding) || 0, emi: Number(loanForm.emi) || 0, rate: parseFloat(loanForm.rate) || 0 };
    if (editLoanId !== null) {
      setLoans(prev => prev.map(l => l.id === editLoanId ? { ...l, ...rec } : l));
      notify('Loan updated');
    } else {
      setLoans(prev => [...prev, { ...rec, id: nextLoanId() }]);
      notify('Loan added');
    }
    setShowLoanModal(false);
  };

  const handleDeleteLoan = (id: number) => { setLoans(prev => prev.filter(l => l.id !== id)); notify('Loan deleted'); };

  const acf = (k: string) => (e: any) => setACForm((p: any) => ({ ...p, [k]: e.target.value }));
  const lf = (k: string) => (e: any) => setLoanForm((p: any) => ({ ...p, [k]: e.target.value }));

  const totalBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
  const totalCCUsed = bankAccounts.reduce((s, a) => s + a.cc_used, 0);
  const totalCCLimit = bankAccounts.reduce((s, a) => s + a.cc_limit, 0);
  const totalEMI = loans.reduce((s, l) => s + l.emi, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Banking & Treasury</div>
          <div className="ph-sub">M13 — Multi-bank · CC drawing power · Loans / EMI · Positive Pay · NEFT/RTGS</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'accounts' && <button className="btn btn-p" onClick={openAddAC}>+ Add Account</button>}
          {tab === 'loans' && <button className="btn btn-p" onClick={openAddLoan}>+ Add Loan</button>}
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc s"><div className="sc-lbl">Total Bank Balance</div><div className="sc-val">₹{(totalBalance / 100000).toFixed(1)}L</div><div className="sc-sub">All accounts</div></div>
        <div className="sc r"><div className="sc-lbl">CC Utilised</div><div className="sc-val">₹{(totalCCUsed / 100000).toFixed(0)}L</div><div className="sc-sub">of ₹{(totalCCLimit / 100000).toFixed(0)}L limit</div></div>
        <div className="sc a"><div className="sc-lbl">EMI Due (Jun)</div><div className="sc-val">₹{(totalEMI / 100000).toFixed(2)}L</div><div className="sc-sub">{loans.length} loans</div></div>
        <div className="sc g"><div className="sc-lbl">Total Outstanding</div><div className="sc-val">₹{(loans.reduce((s, l) => s + l.outstanding, 0) / 100000).toFixed(1)}L</div><div className="sc-sub">All loans</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'accounts' ? ' on' : ''}`} onClick={() => setTab('accounts')}>Bank Accounts</button>
        <button className={`itab${tab === 'loans' ? ' on' : ''}`} onClick={() => setTab('loans')}>Loans & EMI</button>
        <button className={`itab${tab === 'recon' ? ' on' : ''}`} onClick={() => setTab('recon')}>Bank Recon</button>
      </div>

      {tab === 'accounts' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Bank Accounts — {bankAccounts.length} accounts</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Bank</th><th>Branch</th><th>Account No.</th><th>Type</th><th className="r">Balance (₹)</th><th className="r">CC Limit</th><th className="r">CC Used</th><th className="r">Available</th><th>Actions</th></tr></thead>
              <tbody>
                {bankAccounts.map(a => (
                  <tr key={a.id}>
                    <td className="tdc">{a.bank}</td>
                    <td>{a.branch}</td>
                    <td className="tdm">{a.acno}</td>
                    <td><span className="bdg b-g">{a.type}</span></td>
                    <td className="tda" style={{ color: a.balance > 0 ? 'var(--sage)' : 'var(--red)' }}>₹{Math.abs(a.balance).toLocaleString()}</td>
                    <td className="tda">{a.cc_limit ? `₹${(a.cc_limit / 100000).toFixed(0)}L` : '--'}</td>
                    <td className="tda" style={{ color: a.cc_used ? 'var(--amber)' : undefined }}>{a.cc_used ? `₹${(a.cc_used / 100000).toFixed(0)}L` : '--'}</td>
                    <td className="tda" style={{ color: 'var(--sage)' }}>{a.cc_limit ? `₹${((a.cc_limit - a.cc_used) / 100000).toFixed(0)}L` : '--'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditAC(a)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteAC(a.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'loans' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Loan Register — {loans.length} loans</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Ref</th><th>Bank</th><th>Purpose</th><th className="r">Sanction (₹)</th><th className="r">Outstanding (₹)</th><th className="r">EMI (₹)</th><th>Next Due</th><th className="r">Rate %</th><th>Actions</th></tr></thead>
              <tbody>
                {loans.map(l => (
                  <tr key={l.id}>
                    <td className="tdm tdc">{l.ref}</td>
                    <td>{l.bank}</td>
                    <td>{l.purpose}</td>
                    <td className="tda">₹{(l.sanction / 100000).toFixed(1)}L</td>
                    <td className="tda" style={{ color: 'var(--amber)' }}>₹{(l.outstanding / 100000).toFixed(1)}L</td>
                    <td className="tda">₹{l.emi.toLocaleString()}</td>
                    <td className="tdm">{l.next_due}</td>
                    <td className="tda">{l.rate}%</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditLoan(l)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteLoan(l.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg3)' }}>
                  <td colSpan={4} className="tdm" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 8 }}>Total Outstanding</td>
                  <td className="tda tdc" style={{ color: 'var(--amber)', fontWeight: 700 }}>₹{(loans.reduce((s, l) => s + l.outstanding, 0) / 100000).toFixed(1)}L</td>
                  <td className="tda tdc" style={{ fontWeight: 700 }}>₹{loans.reduce((s, l) => s + l.emi, 0).toLocaleString()}</td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'recon' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Bank Reconciliation — HDFC Main A/c</div>
            <button className="btn btn-sm btn-s" onClick={() => notify('Import bank statement', 'warn')}>Import Statement</button>
          </div>
          <div className="card-body"><div className="empty-state">Import bank statement (MT940 / XLS / PDF) to auto-reconcile</div></div>
        </div>
      )}

      {showACModal && (
        <div className="modal-backdrop" onClick={() => setShowACModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editACId !== null ? 'Edit Bank Account' : 'Add Bank Account'}</div>
              <button className="modal-close" onClick={() => setShowACModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Bank Name *</label><input className="fi" value={acForm.bank} onChange={acf('bank')} placeholder="HDFC Bank" /></div>
                <div className="fg"><label className="fl">Branch</label><input className="fi" value={acForm.branch} onChange={acf('branch')} placeholder="Krishnagiri" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Account No. *</label><input className="fi" value={acForm.acno} onChange={acf('acno')} placeholder="XXXX-XXXX-1234" /></div>
                <div className="fg"><label className="fl">Type</label><select className="fsel" value={acForm.type} onChange={acf('type')}>{AC_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Balance (₹)</label><input className="fi" type="number" value={acForm.balance} onChange={acf('balance')} placeholder="0" /></div>
                <div className="fg"><label className="fl">CC Limit (₹)</label><input className="fi" type="number" value={acForm.cc_limit} onChange={acf('cc_limit')} placeholder="0" /></div>
                <div className="fg"><label className="fl">CC Used (₹)</label><input className="fi" type="number" value={acForm.cc_used} onChange={acf('cc_used')} placeholder="0" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowACModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveAC}>{editACId !== null ? 'Update' : 'Add Account'}</button>
            </div>
          </div>
        </div>
      )}

      {showLoanModal && (
        <div className="modal-backdrop" onClick={() => setShowLoanModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-head">
              <div className="modal-title">{editLoanId !== null ? 'Edit Loan' : 'Add Loan'}</div>
              <button className="modal-close" onClick={() => setShowLoanModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Ref No.</label><input className="fi" value={loanForm.ref} onChange={lf('ref')} placeholder="LOAN-EXC-001" /></div>
                <div className="fg"><label className="fl">Bank *</label><input className="fi" value={loanForm.bank} onChange={lf('bank')} placeholder="HDFC Bank" /></div>
              </div>
              <div className="fg"><label className="fl">Purpose *</label><input className="fi" value={loanForm.purpose} onChange={lf('purpose')} placeholder="Komatsu PC200 Excavator" /></div>
              <div className="fg3">
                <div className="fg"><label className="fl">Sanction Amount (₹)</label><input className="fi" type="number" value={loanForm.sanction} onChange={lf('sanction')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Outstanding (₹)</label><input className="fi" type="number" value={loanForm.outstanding} onChange={lf('outstanding')} placeholder="0" /></div>
                <div className="fg"><label className="fl">EMI (₹/month)</label><input className="fi" type="number" value={loanForm.emi} onChange={lf('emi')} placeholder="0" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Next Due Date</label><input className="fi" type="date" value={loanForm.next_due} onChange={lf('next_due')} /></div>
                <div className="fg"><label className="fl">Interest Rate %</label><input className="fi" type="number" step="0.01" value={loanForm.rate} onChange={lf('rate')} placeholder="11.5" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowLoanModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveLoan}>{editLoanId !== null ? 'Update' : 'Add Loan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
