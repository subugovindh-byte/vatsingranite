import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const DEPTS = ['Operations', 'Blasting', 'Wire Saw', 'Accounts', 'Admin', 'Safety', 'Maintenance', 'Logistics'];
const EMP_TYPES = ['permanent', 'contract', 'casual'];
const BLANK = { empName: '', primaryQuarryId: '', department: 'Operations', designation: '', employmentType: 'permanent', dateOfJoining: '', uanNo: '', esiNo: '', pan: '', bankName: '', bankAccountNo: '', bankIfsc: '', basicSalary: '' };

export default function EmployeesPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'master' | 'attendance'>('master');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [employees, setEmployees] = useState<any[]>([]);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.getEmployees(), apiClient.getQuarries()])
      .then(([e, q]: any) => {
        setEmployees(e.employees ?? []);
        setQuarries(q.quarries ?? q);
      })
      .catch(() => notify('Failed to load employees', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const loadAttendance = () => {
    const now = new Date();
    apiClient.getAttendance({ month: now.getMonth() + 1, year: now.getFullYear(), limit: 500 })
      .then((a: any) => setAttendance(a.attendance ?? []))
      .catch(() => notify('Failed to load attendance', 'error'));
  };

  const reload = () => {
    apiClient.getEmployees()
      .then((e: any) => setEmployees(e.employees ?? []))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const filtered = employees.filter(e =>
    !search || (e.emp_name ?? '').toLowerCase().includes(search.toLowerCase()) || (e.emp_code ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm({ ...BLANK, primaryQuarryId: quarries[0]?.id || '' }); setEditId(null); setShowModal(true); };
  const openEdit = (e: any) => {
    setForm({
      empName: e.emp_name ?? '', primaryQuarryId: e.primary_quarry_id ?? '', department: e.department ?? 'Operations',
      designation: e.designation ?? '', employmentType: e.employment_type ?? 'permanent', dateOfJoining: e.date_of_joining ?? '',
      uanNo: e.uan_no ?? '', esiNo: e.esi_no ?? '', pan: e.pan ?? '', bankName: e.bank_name ?? '',
      bankAccountNo: e.bank_account_no ?? '', bankIfsc: e.bank_ifsc ?? '', basicSalary: String(e.basic_salary ?? '')
    });
    setEditId(e.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.empName) { notify('Employee name is required', 'error'); return; }
    try {
      const payload = {
        empName: form.empName,
        primaryQuarryId: form.primaryQuarryId ? Number(form.primaryQuarryId) : undefined,
        department: form.department,
        designation: form.designation,
        employmentType: form.employmentType,
        dateOfJoining: form.dateOfJoining || undefined,
        uanNo: form.uanNo || undefined,
        esiNo: form.esiNo || undefined,
        pan: form.pan || undefined,
        bankName: form.bankName || undefined,
        bankAccountNo: form.bankAccountNo || undefined,
        bankIfsc: form.bankIfsc || undefined,
        basicSalary: parseFloat(form.basicSalary) || 0
      };
      if (editId !== null) {
        await apiClient.updateEmployee(editId, payload);
        notify('Employee updated');
      } else {
        await apiClient.createEmployee(payload);
        notify('Employee added');
      }
      setShowModal(false);
      reload();
    } catch {
      notify('Failed to save employee', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  const totalPayroll = employees.reduce((s, e) => s + Number(e.basic_salary ?? 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Employees</div>
          <div className="ph-sub">M14 — Employee master · UAN/ESIC/PAN · Attendance · DGMS certs</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="fi" placeholder="Search employee..." style={{ width: 180 }} value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-p" onClick={openAdd}>+ Add Employee</button>
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc g"><div className="sc-lbl">Total Employees</div><div className="sc-val">{employees.length}</div><div className="sc-sub">On rolls</div></div>
        <div className="sc s"><div className="sc-lbl">Permanent</div><div className="sc-val">{employees.filter(e => e.employment_type === 'permanent').length}</div><div className="sc-sub">Full-time</div></div>
        <div className="sc b"><div className="sc-lbl">Contract / Casual</div><div className="sc-val">{employees.filter(e => e.employment_type !== 'permanent').length}</div><div className="sc-sub">Other category</div></div>
        <div className="sc a"><div className="sc-lbl">Monthly Basic</div><div className="sc-val">₹{(totalPayroll / 100000).toFixed(2)}L</div><div className="sc-sub">Total basic salary</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'master' ? ' on' : ''}`} onClick={() => setTab('master')}>Employee Master</button>
        <button className={`itab${tab === 'attendance' ? ' on' : ''}`} onClick={() => { setTab('attendance'); loadAttendance(); }}>Attendance Register</button>
      </div>

      {tab === 'master' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Employee Master — {filtered.length} records</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Dept</th><th>Designation</th><th>DOJ</th><th>UAN</th><th>ESIC</th><th>PAN</th><th className="r">Basic (₹)</th><th>Type</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td className="tdm tdc">{e.emp_code}</td>
                    <td className="tdc">{e.emp_name}</td>
                    <td><span className="bdg b-b">{e.department ?? '—'}</span></td>
                    <td style={{ fontSize: 10 }}>{e.designation ?? '—'}</td>
                    <td className="tdm">{e.date_of_joining ?? '—'}</td>
                    <td className="tdm" style={{ fontSize: 9 }}>{e.uan_no ?? '—'}</td>
                    <td className="tdm" style={{ fontSize: 9 }}>{e.esi_no || <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                    <td className="tdm" style={{ fontSize: 9 }}>{e.pan ?? '—'}</td>
                    <td className="tda">₹{Number(e.basic_salary ?? 0).toLocaleString()}</td>
                    <td><span className={`bdg ${e.employment_type === 'permanent' ? 'b-s' : 'b-a'}`}>{e.employment_type ?? 'permanent'}</span></td>
                    <td>
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(e)}>Edit</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No employees found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Attendance Register — Current Month</div>
          </div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Date</th><th>Status</th><th className="r">OT Hours</th><th>Shift</th></tr>
              </thead>
              <tbody>
                {attendance.map((a: any) => (
                  <tr key={a.id}>
                    <td className="tdm tdc">{a.emp_code}</td>
                    <td className="tdc">{a.emp_name}</td>
                    <td className="tdm">{a.attendance_date}</td>
                    <td><span className={`bdg ${a.status === 'present' ? 'b-s' : a.status === 'absent' ? 'b-r' : 'b-a'}`}>{a.status}</span></td>
                    <td className="tda">{Number(a.ot_hours ?? 0) > 0 ? Number(a.ot_hours).toFixed(1) : '—'}</td>
                    <td className="tdm">{a.shift_type ?? '—'}</td>
                  </tr>
                ))}
                {attendance.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No attendance records for this month</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 600 }}>
            <div className="modal-head">
              <div className="modal-title">{editId !== null ? 'Edit Employee' : 'Add Employee'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Full Name *</label><input className="fi" value={form.empName} onChange={f('empName')} placeholder="Full name" /></div>
                <div className="fg">
                  <label className="fl">Employment Type</label>
                  <select className="fsel" value={form.employmentType} onChange={f('employmentType')}>{EMP_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                </div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Department</label>
                  <select className="fsel" value={form.department} onChange={f('department')}>{DEPTS.map(d => <option key={d}>{d}</option>)}</select>
                </div>
                <div className="fg"><label className="fl">Designation</label><input className="fi" value={form.designation} onChange={f('designation')} placeholder="Site Supervisor" /></div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Primary Quarry</label>
                  <select className="fsel" value={form.primaryQuarryId} onChange={f('primaryQuarryId')}>
                    <option value="">Select quarry…</option>
                    {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Date of Joining</label><input className="fi" type="date" value={form.dateOfJoining} onChange={f('dateOfJoining')} /></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">UAN</label><input className="fi" value={form.uanNo} onChange={f('uanNo')} placeholder="UAN100041234" /></div>
                <div className="fg"><label className="fl">ESIC No.</label><input className="fi" value={form.esiNo} onChange={f('esiNo')} placeholder="ESIC100041234" /></div>
                <div className="fg"><label className="fl">PAN</label><input className="fi" value={form.pan} onChange={f('pan')} placeholder="AAAPK1234B" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Basic Salary (₹)</label><input className="fi" type="number" value={form.basicSalary} onChange={f('basicSalary')} placeholder="20000" /></div>
                <div className="fg"><label className="fl">Bank Name</label><input className="fi" value={form.bankName} onChange={f('bankName')} placeholder="SBI" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Bank Account No.</label><input className="fi" value={form.bankAccountNo} onChange={f('bankAccountNo')} placeholder="XXXX-XXXX-1234" /></div>
                <div className="fg"><label className="fl">IFSC Code</label><input className="fi" value={form.bankIfsc} onChange={f('bankIfsc')} placeholder="SBIN0001234" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId !== null ? 'Update Employee' : 'Add Employee'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
