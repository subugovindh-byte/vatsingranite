import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const BLANK_VAR = { code: '', name: '', color: '', finish: 'Natural/Raw', hsn: '2516', gst_rate: '5', unit: 'CBM', quarry: 'Vatsin Granite' };
const BLANK_CUST = { code: '', name: '', gstin: '', city: '', state: '', credit_days: '30', outstanding: '0' };
const BLANK_VEND = { code: '', name: '', gstin: '', category: '', credit_days: '30', outstanding: '0' };
const BLANK_COA = { group: 'Revenue', code: '', name: '', type: 'Revenue' };
const COA_GROUPS = ['Revenue', 'Direct Costs', 'Overheads', 'Assets', 'Liabilities'];
const COA_TYPES = ['Revenue', 'Expense', 'Asset', 'Liability', 'Equity'];

export default function MastersPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'varieties' | 'coa' | 'customers' | 'vendors' | 'hsn'>('varieties');

  const [varieties, setVarieties] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<any[]>([]);

  useEffect(() => {
    apiClient.getVarieties().then((v: any[]) => setVarieties(v.map((x: any) => ({
      id: x.id,
      code: x.variety_code ?? x.code,
      name: x.variety_name ?? x.name,
      color: x.color ?? '',
      finish: x.finish ?? 'Natural/Raw',
      hsn: x.hsn_code ?? x.hsn ?? '2516',
      gst_rate: x.gst_rate ?? 5,
      unit: x.unit ?? 'CBM',
      quarry: x.quarry_name ?? x.quarry ?? '',
    })))).catch(() => {});
    apiClient.getCustomers().then(r => {
      const raw: any[] = (r as any).customers ?? (Array.isArray(r) ? r : []);
      setCustomers(raw.map((c: any) => ({
        id: c.id,
        code: c.customer_code ?? c.code,
        name: c.customer_name ?? c.name,
        gstin: c.gstin ?? '',
        city: c.city ?? '',
        state: c.state ?? '',
        credit_days: c.credit_days ?? 30,
        outstanding: c.outstanding ?? 0,
      })));
    }).catch(() => {});
    apiClient.getAccounts().then(r => {
      const raw: any[] = Array.isArray(r) ? r : (r as any).accounts ?? [];
      setCoaAccounts(raw.map((a: any) => ({
        id: a.id,
        group: a.account_group ?? a.group ?? 'Other',
        code: a.account_code ?? a.code,
        name: a.account_name ?? a.name,
        type: a.account_type ?? a.type,
      })));
    }).catch(() => {});
  }, []);

  const [showCoaModal, setShowCoaModal] = useState(false);
  const [coaForm, setCoaForm] = useState<any>(BLANK_COA);
  const [editCoaId, setEditCoaId] = useState<number | null>(null);

  const nextCoaId = () => (coaAccounts.length === 0 ? 1 : Math.max(...coaAccounts.map(a => a.id)) + 1);
  const openAddCoa = () => { setCoaForm(BLANK_COA); setEditCoaId(null); setShowCoaModal(true); };
  const openEditCoa = (a: any) => { setCoaForm({ ...a }); setEditCoaId(a.id); setShowCoaModal(true); };
  const handleSaveCoa = () => {
    if (!coaForm.code || !coaForm.name) { notify('Code and name required', 'error'); return; }
    if (editCoaId !== null) {
      setCoaAccounts(prev => prev.map(a => a.id === editCoaId ? { ...a, ...coaForm } : a));
      notify('Account updated');
    } else {
      setCoaAccounts(prev => [...prev, { ...coaForm, id: nextCoaId() }]);
      notify('Account added');
    }
    setShowCoaModal(false);
  };
  const handleDeleteCoa = (id: number) => { setCoaAccounts(prev => prev.filter(a => a.id !== id)); notify('Account deleted'); };
  const coaf = (k: string) => (e: any) => setCoaForm((p: any) => ({ ...p, [k]: e.target.value }));

  const coaByGroup = COA_GROUPS.map(g => ({ group: g, accounts: coaAccounts.filter(a => a.group === g) })).filter(g => g.accounts.length > 0);

  const [showVarModal, setShowVarModal] = useState(false);
  const [varForm, setVarForm] = useState<any>(BLANK_VAR);
  const [editVarId, setEditVarId] = useState<number | null>(null);

  const [showCustModal, setShowCustModal] = useState(false);
  const [custForm, setCustForm] = useState<any>(BLANK_CUST);
  const [editCustId, setEditCustId] = useState<number | null>(null);

  const [showVendModal, setShowVendModal] = useState(false);
  const [vendForm, setVendForm] = useState<any>(BLANK_VEND);
  const [editVendId, setEditVendId] = useState<number | null>(null);

  const nextVarId = () => (varieties.length === 0 ? 1 : Math.max(...varieties.map(v => v.id)) + 1);
  const nextCustId = () => (customers.length === 0 ? 1 : Math.max(...customers.map(c => c.id)) + 1);
  const nextVendId = () => (vendors.length === 0 ? 1 : Math.max(...vendors.map(v => v.id)) + 1);

  const openAddVar = () => { setVarForm(BLANK_VAR); setEditVarId(null); setShowVarModal(true); };
  const openEditVar = (v: any) => { setVarForm({ ...v, gst_rate: String(v.gst_rate) }); setEditVarId(v.id); setShowVarModal(true); };
  const handleSaveVar = () => {
    if (!varForm.code || !varForm.name) { notify('Code and name required', 'error'); return; }
    const rec = { ...varForm, gst_rate: Number(varForm.gst_rate) || 5 };
    if (editVarId !== null) { setVarieties(prev => prev.map(v => v.id === editVarId ? { ...v, ...rec } : v)); notify('Variety updated'); }
    else { setVarieties(prev => [...prev, { ...rec, id: nextVarId() }]); notify('Variety added'); }
    setShowVarModal(false);
  };
  const handleDeleteVar = (id: number) => { setVarieties(prev => prev.filter(v => v.id !== id)); notify('Variety deleted'); };

  const openAddCust = () => { setCustForm({ ...BLANK_CUST, code: `CUST-${String(nextCustId()).padStart(3, '0')}` }); setEditCustId(null); setShowCustModal(true); };
  const openEditCust = (c: any) => { setCustForm({ ...c, credit_days: String(c.credit_days), outstanding: String(c.outstanding) }); setEditCustId(c.id); setShowCustModal(true); };
  const handleSaveCust = () => {
    if (!custForm.code || !custForm.name) { notify('Code and name required', 'error'); return; }
    const rec = { ...custForm, credit_days: Number(custForm.credit_days) || 0, outstanding: Number(custForm.outstanding) || 0 };
    if (editCustId !== null) { setCustomers(prev => prev.map(c => c.id === editCustId ? { ...c, ...rec } : c)); notify('Customer updated'); }
    else { setCustomers(prev => [...prev, { ...rec, id: nextCustId() }]); notify('Customer added'); }
    setShowCustModal(false);
  };
  const handleDeleteCust = (id: number) => { setCustomers(prev => prev.filter(c => c.id !== id)); notify('Customer deleted'); };

  const openAddVend = () => { setVendForm({ ...BLANK_VEND, code: `VEND-${String(nextVendId()).padStart(3, '0')}` }); setEditVendId(null); setShowVendModal(true); };
  const openEditVend = (v: any) => { setVendForm({ ...v, credit_days: String(v.credit_days), outstanding: String(v.outstanding) }); setEditVendId(v.id); setShowVendModal(true); };
  const handleSaveVend = () => {
    if (!vendForm.code || !vendForm.name) { notify('Code and name required', 'error'); return; }
    const rec = { ...vendForm, credit_days: Number(vendForm.credit_days) || 0, outstanding: Number(vendForm.outstanding) || 0 };
    if (editVendId !== null) { setVendors(prev => prev.map(v => v.id === editVendId ? { ...v, ...rec } : v)); notify('Vendor updated'); }
    else { setVendors(prev => [...prev, { ...rec, id: nextVendId() }]); notify('Vendor added'); }
    setShowVendModal(false);
  };
  const handleDeleteVend = (id: number) => { setVendors(prev => prev.filter(v => v.id !== id)); notify('Vendor deleted'); };

  const vf = (k: string) => (e: any) => setVarForm((p: any) => ({ ...p, [k]: e.target.value }));
  const cf = (k: string) => (e: any) => setCustForm((p: any) => ({ ...p, [k]: e.target.value }));
  const vnf = (k: string) => (e: any) => setVendForm((p: any) => ({ ...p, [k]: e.target.value }));

  const addLabel = () => {
    if (tab === 'varieties') return '+ Variety';
    if (tab === 'coa') return '+ Account';
    if (tab === 'customers') return '+ Customer';
    if (tab === 'vendors') return '+ Vendor';
    return null;
  };
  const handleAdd = () => {
    if (tab === 'varieties') openAddVar();
    else if (tab === 'coa') openAddCoa();
    else if (tab === 'customers') openAddCust();
    else if (tab === 'vendors') openAddVend();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Masters</div>
          <div className="ph-sub">M30 — Varieties · Chart of Accounts · Customers · Vendors · HSN / GST codes</div>
        </div>
        {addLabel() && <button className="btn btn-p" onClick={handleAdd}>{addLabel()}</button>}
      </div>

      <div className="sc-grid">
        <div className="sc g"><div className="sc-lbl">Varieties</div><div className="sc-val">{varieties.length}</div><div className="sc-sub">Products defined</div></div>
        <div className="sc b"><div className="sc-lbl">GL Accounts</div><div className="sc-val">{coaAccounts.length}</div><div className="sc-sub">Chart of Accounts</div></div>
        <div className="sc s"><div className="sc-lbl">Customers</div><div className="sc-val">{customers.length}</div><div className="sc-sub">Active parties</div></div>
        <div className="sc a"><div className="sc-lbl">Vendors</div><div className="sc-val">{vendors.length}</div><div className="sc-sub">Suppliers</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'varieties' ? ' on' : ''}`} onClick={() => setTab('varieties')}>Granite Varieties</button>
        <button className={`itab${tab === 'coa' ? ' on' : ''}`} onClick={() => setTab('coa')}>Chart of Accounts</button>
        <button className={`itab${tab === 'customers' ? ' on' : ''}`} onClick={() => setTab('customers')}>Customers</button>
        <button className={`itab${tab === 'vendors' ? ' on' : ''}`} onClick={() => setTab('vendors')}>Vendors</button>
        <button className={`itab${tab === 'hsn' ? ' on' : ''}`} onClick={() => setTab('hsn')}>HSN / GST Codes</button>
      </div>

      {tab === 'varieties' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Granite Variety Master — {varieties.length} varieties</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Code</th><th>Variety Name</th><th>Color</th><th>Finish</th><th>HSN</th><th className="r">GST Rate</th><th>Unit</th><th>Quarry</th><th>Actions</th></tr></thead>
              <tbody>
                {varieties.map(v => (
                  <tr key={v.id}>
                    <td className="tdm tdc">{v.code}</td>
                    <td className="tdc">{v.name}</td>
                    <td>{v.color}</td>
                    <td><span className="bdg b-b">{v.finish}</span></td>
                    <td className="tdm">{v.hsn}</td>
                    <td className="tda">{v.gst_rate}%</td>
                    <td><span className="bdg b-g">{v.unit}</span></td>
                    <td style={{ fontSize: 10 }}>{v.quarry}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditVar(v)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteVar(v.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'coa' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Chart of Accounts — {coaAccounts.length} accounts</div></div>
          <div className="card-body" style={{ padding: 0 }}>
            {coaByGroup.map(g => (
              <div key={g.group}>
                <div style={{ padding: '10px 16px', background: 'var(--bg3)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--rust)', borderBottom: '1px solid var(--bd)' }}>{g.group}</div>
                <table className="dt">
                  <tbody>
                    {g.accounts.map(a => (
                      <tr key={a.id}>
                        <td className="tdm tdc" style={{ width: 80 }}>{a.code}</td>
                        <td>{a.name}</td>
                        <td style={{ width: 100 }}><span className={`bdg ${a.type === 'Revenue' ? 'b-s' : a.type === 'Asset' ? 'b-b' : 'b-r'}`}>{a.type}</span></td>
                        <td style={{ width: 100 }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-xs btn-s" onClick={() => openEditCoa(a)}>Edit</button>
                            <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteCoa(a.id)}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'customers' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Customer Master — {customers.length} customers</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Code</th><th>Customer Name</th><th>GSTIN</th><th>City / State</th><th className="r">Credit Days</th><th className="r">Outstanding (₹)</th><th>Actions</th></tr></thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td className="tdm tdc">{c.code}</td>
                    <td className="tdc">{c.name}</td>
                    <td className="tdm" style={{ fontSize: 9 }}>{c.gstin || <span style={{ color: 'var(--t3)' }}>Export / N/A</span>}</td>
                    <td>{c.city}, {c.state}</td>
                    <td className="tda">{c.credit_days ? `${c.credit_days} days` : 'Advance'}</td>
                    <td className="tda" style={{ color: c.outstanding > 0 ? 'var(--amber)' : 'var(--sage)' }}>{c.outstanding > 0 ? `₹${c.outstanding.toLocaleString()}` : 'Nil'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditCust(c)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteCust(c.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'vendors' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Vendor Master — {vendors.length} vendors</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Code</th><th>Vendor Name</th><th>GSTIN</th><th>Category</th><th className="r">Credit Days</th><th className="r">Outstanding (₹)</th><th>Actions</th></tr></thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td className="tdm tdc">{v.code}</td>
                    <td className="tdc">{v.name}</td>
                    <td className="tdm" style={{ fontSize: 9 }}>{v.gstin || <span style={{ color: 'var(--t3)' }}>Import</span>}</td>
                    <td style={{ fontSize: 10 }}>{v.category}</td>
                    <td className="tda">{v.credit_days ? `${v.credit_days} days` : 'Advance'}</td>
                    <td className="tda" style={{ color: v.outstanding > 0 ? 'var(--amber)' : 'var(--sage)' }}>{v.outstanding > 0 ? `₹${v.outstanding.toLocaleString()}` : 'Nil'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditVend(v)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteVend(v.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'hsn' && (
        <div className="card">
          <div className="card-head"><div className="card-title">HSN Code & GST Rate Reference</div></div>
          <div className="card-body">
            <div className="tw">
              <table className="dt">
                <thead><tr><th>HSN Code</th><th>Description</th><th className="r">GST Rate</th><th>Notes</th></tr></thead>
                <tbody>
                  {[
                    { hsn: '2516', desc: 'Granite — crude/roughly trimmed blocks (natural stone)', gst: '5%', notes: 'Primary product — all quarry block sales' },
                    { hsn: '2517', desc: 'Pebbles, gravel, broken/crushed stone, macadam', gst: '5%', notes: 'Offcuts, chips, waste aggregate' },
                    { hsn: '6802', desc: 'Worked monumental or building stone (slabs, tiles)', gst: '18%', notes: 'Polished slabs, tiles, processed granite' },
                    { hsn: '8430', desc: 'Moving, grading, levelling, scraping machinery', gst: '18%', notes: 'Excavators, bulldozers — capital asset purchase' },
                    { hsn: '3602', desc: 'Prepared explosives (other than propellent powders)', gst: '18%', notes: 'ANFO, emulsion explosives — PESO licensed purchase' },
                    { hsn: '6804', desc: 'Millstones, grindstones, grinding wheels', gst: '18%', notes: 'Diamond blades, grinding discs — consumables' },
                  ].map(h => (
                    <tr key={h.hsn}>
                      <td className="tdm tdc" style={{ fontWeight: 700 }}>{h.hsn}</td>
                      <td>{h.desc}</td>
                      <td className="tda" style={{ color: h.gst === '5%' ? 'var(--sage)' : 'var(--amber)', fontWeight: 700 }}>{h.gst}</td>
                      <td style={{ fontSize: 10, color: 'var(--t2)' }}>{h.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showCoaModal && (
        <div className="modal-backdrop" onClick={() => setShowCoaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <div className="modal-title">{editCoaId !== null ? 'Edit GL Account' : 'Add GL Account'}</div>
              <button className="modal-close" onClick={() => setShowCoaModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Account Code *</label><input className="fi" value={coaForm.code} onChange={coaf('code')} placeholder="4004" /></div>
                <div className="fg"><label className="fl">Type</label><select className="fsel" value={coaForm.type} onChange={coaf('type')}>{COA_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="fg"><label className="fl">Account Name *</label><input className="fi" value={coaForm.name} onChange={coaf('name')} placeholder="Account description" /></div>
              <div className="fg"><label className="fl">Group</label><select className="fsel" value={coaForm.group} onChange={coaf('group')}>{COA_GROUPS.map(g => <option key={g}>{g}</option>)}</select></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowCoaModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveCoa}>{editCoaId !== null ? 'Update Account' : 'Add Account'}</button>
            </div>
          </div>
        </div>
      )}

      {showVarModal && (
        <div className="modal-backdrop" onClick={() => setShowVarModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editVarId !== null ? 'Edit Variety' : 'Add Granite Variety'}</div>
              <button className="modal-close" onClick={() => setShowVarModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Code *</label><input className="fi" value={varForm.code} onChange={vf('code')} placeholder="VATSIN-BK-NAT" /></div>
                <div className="fg"><label className="fl">HSN Code</label><input className="fi" value={varForm.hsn} onChange={vf('hsn')} placeholder="2516" /></div>
              </div>
              <div className="fg"><label className="fl">Variety Name *</label><input className="fi" value={varForm.name} onChange={vf('name')} placeholder="Vatsin Granite — Natural Finish Block" /></div>
              <div className="fg3">
                <div className="fg"><label className="fl">Color</label><input className="fi" value={varForm.color} onChange={vf('color')} placeholder="Steel Grey" /></div>
                <div className="fg"><label className="fl">Finish</label><input className="fi" value={varForm.finish} onChange={vf('finish')} placeholder="Natural/Raw" /></div>
                <div className="fg"><label className="fl">Unit</label><select className="fsel" value={varForm.unit} onChange={vf('unit')}><option>CBM</option><option>SQM</option><option>MT</option><option>NOS</option></select></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">GST Rate %</label><input className="fi" type="number" value={varForm.gst_rate} onChange={vf('gst_rate')} placeholder="5" /></div>
                <div className="fg"><label className="fl">Quarry</label><select className="fsel" value={varForm.quarry} onChange={vf('quarry')}><option>Vatsin Granite</option><option>Paradiso Quarry</option><option>Both</option></select></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowVarModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveVar}>{editVarId !== null ? 'Update' : 'Add Variety'}</button>
            </div>
          </div>
        </div>
      )}

      {showCustModal && (
        <div className="modal-backdrop" onClick={() => setShowCustModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editCustId !== null ? 'Edit Customer' : 'Add Customer'}</div>
              <button className="modal-close" onClick={() => setShowCustModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Code *</label><input className="fi" value={custForm.code} onChange={cf('code')} placeholder="CUST-005" /></div>
                <div className="fg"><label className="fl">GSTIN</label><input className="fi" value={custForm.gstin} onChange={cf('gstin')} placeholder="33XXXXX1234X1Z1" /></div>
              </div>
              <div className="fg"><label className="fl">Customer Name *</label><input className="fi" value={custForm.name} onChange={cf('name')} placeholder="Customer full name" /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">City</label><input className="fi" value={custForm.city} onChange={cf('city')} placeholder="Chennai" /></div>
                <div className="fg"><label className="fl">State / Country</label><input className="fi" value={custForm.state} onChange={cf('state')} placeholder="TN" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Credit Days</label><input className="fi" type="number" value={custForm.credit_days} onChange={cf('credit_days')} placeholder="30" /></div>
                <div className="fg"><label className="fl">Outstanding (₹)</label><input className="fi" type="number" value={custForm.outstanding} onChange={cf('outstanding')} placeholder="0" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowCustModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveCust}>{editCustId !== null ? 'Update' : 'Add Customer'}</button>
            </div>
          </div>
        </div>
      )}

      {showVendModal && (
        <div className="modal-backdrop" onClick={() => setShowVendModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editVendId !== null ? 'Edit Vendor' : 'Add Vendor'}</div>
              <button className="modal-close" onClick={() => setShowVendModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Code *</label><input className="fi" value={vendForm.code} onChange={vnf('code')} placeholder="VEND-006" /></div>
                <div className="fg"><label className="fl">GSTIN</label><input className="fi" value={vendForm.gstin} onChange={vnf('gstin')} placeholder="33XXXXX1234X1Z1" /></div>
              </div>
              <div className="fg"><label className="fl">Vendor Name *</label><input className="fi" value={vendForm.name} onChange={vnf('name')} placeholder="Vendor full name" /></div>
              <div className="fg"><label className="fl">Category</label><input className="fi" value={vendForm.category} onChange={vnf('category')} placeholder="e.g. HSD Diesel, Diamond Wire" /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Credit Days</label><input className="fi" type="number" value={vendForm.credit_days} onChange={vnf('credit_days')} placeholder="30" /></div>
                <div className="fg"><label className="fl">Outstanding (₹)</label><input className="fi" type="number" value={vendForm.outstanding} onChange={vnf('outstanding')} placeholder="0" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowVendModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveVend}>{editVendId !== null ? 'Update' : 'Add Vendor'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
