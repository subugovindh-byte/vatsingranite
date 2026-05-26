import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/employees
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, department, active = 1, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT e.*, q.quarry_name
      FROM employees e
      LEFT JOIN quarries q ON e.primary_quarry_id = q.id
      WHERE e.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND e.primary_quarry_id = ?`; params.push(quarryId); }
    if (department) { query += ` AND e.department = ?`; params.push(department); }
    query += ` AND e.active = ? ORDER BY e.emp_name LIMIT ? OFFSET ?`;
    params.push(parseInt(active), parseInt(limit), parseInt(offset));

    const employees = db.prepare(query).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM employees WHERE org_id = ? AND active = ?`).get(req.user.orgId, parseInt(active));

    res.json({ employees, pagination: { total, limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (err) {
    console.error('Get employees error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch employees' });
  }
});

// GET /api/employees/attendance/list
router.get('/attendance/list', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, empId, date, month, year, limit = 200, offset = 0 } = req.query;

    let query = `
      SELECT a.*, e.emp_name, e.emp_code, e.designation
      FROM attendance a
      JOIN employees e ON a.emp_id = e.id
      WHERE a.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND a.quarry_id = ?`; params.push(quarryId); }
    if (empId) { query += ` AND a.emp_id = ?`; params.push(empId); }
    if (date) { query += ` AND a.attendance_date = ?`; params.push(date); }
    if (month && year) {
      query += ` AND strftime('%m', a.attendance_date) = ? AND strftime('%Y', a.attendance_date) = ?`;
      params.push(String(month).padStart(2, '0'), String(year));
    }

    query += ` ORDER BY a.attendance_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch attendance' });
  }
});

// POST /api/employees/attendance
router.post('/attendance', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, empId, attendanceDate, shiftType, inTime, outTime, hoursWorked, otHours, status } = req.body;

    if (!quarryId || !empId || !attendanceDate) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId, empId, attendanceDate required' });
    }

    db.prepare(`
      INSERT INTO attendance (org_id, quarry_id, emp_id, attendance_date, shift_type, in_time, out_time, hours_worked, ot_hours, status)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(quarry_id, emp_id, attendance_date) DO UPDATE SET
        shift_type = excluded.shift_type, in_time = excluded.in_time, out_time = excluded.out_time,
        hours_worked = excluded.hours_worked, ot_hours = excluded.ot_hours, status = excluded.status
    `).run(
      req.user.orgId, quarryId, empId, attendanceDate,
      shiftType || 'day', inTime || null, outTime || null,
      hoursWorked || 8, otHours || 0, status || 'present'
    );

    res.status(201).json({ message: 'Attendance recorded' });
  } catch (err) {
    console.error('Record attendance error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record attendance' });
  }
});

// GET /api/employees/payroll/runs
router.get('/payroll/runs', authenticate, (req, res) => {
  try {
    const db = getDb();
    const runs = db.prepare(`
      SELECT pr.*, e.emp_name as approved_by_name
      FROM payroll_runs pr
      LEFT JOIN employees e ON pr.approved_by = e.id
      WHERE pr.org_id = ?
      ORDER BY pr.pay_period_year DESC, pr.pay_period_month DESC
    `).all(req.user.orgId);
    res.json(runs);
  } catch (err) {
    console.error('Get payroll runs error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch payroll runs' });
  }
});

// POST /api/employees/payroll/runs
router.post('/payroll/runs', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { month, year, quarryId } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Bad Request', message: 'month and year required' });
    }

    let empQuery = `SELECT * FROM employees WHERE org_id = ? AND active = 1`;
    const empParams = [req.user.orgId];
    if (quarryId) { empQuery += ` AND primary_quarry_id = ?`; empParams.push(quarryId); }
    const employees = db.prepare(empQuery).all(...empParams);

    const daysInMonth = new Date(year, month, 0).getDate();

    const runResult = db.prepare(`
      INSERT INTO payroll_runs (org_id, pay_period_month, pay_period_year, run_date, status)
      VALUES (?,?,?,date('now'),'draft')
    `).run(req.user.orgId, month, year);

    const runId = runResult.lastInsertRowid;
    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    const insertDetail = db.prepare(`
      INSERT INTO payroll_details (
        org_id, payroll_run_id, emp_id, days_worked,
        basic_pay, da, hra, other_allowances, gross_pay,
        epf_employee, epf_employer, esi_employee, esi_employer,
        professional_tax, tds, other_deductions, total_deductions, net_pay
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    for (const emp of employees) {
      const att = db.prepare(`
        SELECT COUNT(*) as days_present, COALESCE(SUM(ot_hours),0) as ot_hours
        FROM attendance
        WHERE org_id=? AND emp_id=? AND strftime('%m',attendance_date)=? AND strftime('%Y',attendance_date)=? AND status='present'
      `).get(req.user.orgId, emp.id, String(month).padStart(2,'0'), String(year));

      const daysWorked = att.days_present || daysInMonth;
      const basic = emp.basic_salary || 0;
      const basicPay = (basic / daysInMonth) * daysWorked;
      const da = basicPay * 0.17;
      const hra = basicPay * 0.10;
      const grossPay = basicPay + da + hra;

      const epfEmployee = grossPay <= 15000 ? grossPay * 0.12 : 1800;
      const epfEmployer = epfEmployee;
      const esiEmployee = grossPay <= 21000 ? grossPay * 0.0075 : 0;
      const esiEmployer = grossPay <= 21000 ? grossPay * 0.0325 : 0;
      const professionalTax = grossPay > 15000 ? 200 : grossPay > 10000 ? 150 : 0;
      const totalDed = epfEmployee + esiEmployee + professionalTax;
      const netPay = grossPay - totalDed;

      insertDetail.run(
        req.user.orgId, runId, emp.id, daysWorked,
        basicPay, da, hra, 0, grossPay,
        epfEmployee, epfEmployer, esiEmployee, esiEmployer,
        professionalTax, 0, 0, totalDed, netPay
      );

      totalGross += grossPay;
      totalDeductions += totalDed;
      totalNet += netPay;
    }

    db.prepare(`UPDATE payroll_runs SET total_gross=?, total_deductions=?, total_net=? WHERE id=?`)
      .run(totalGross, totalDeductions, totalNet, runId);

    res.status(201).json(db.prepare(`SELECT * FROM payroll_runs WHERE id=?`).get(runId));
  } catch (err) {
    console.error('Create payroll run error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create payroll run' });
  }
});

// GET /api/employees/payroll/:runId/details
router.get('/payroll/:runId/details', authenticate, (req, res) => {
  try {
    const db = getDb();
    const details = db.prepare(`
      SELECT pd.*, e.emp_name, e.emp_code, e.designation, e.department
      FROM payroll_details pd
      JOIN employees e ON pd.emp_id = e.id
      WHERE pd.payroll_run_id = ? AND pd.org_id = ?
      ORDER BY e.emp_name
    `).all(req.params.runId, req.user.orgId);
    res.json(details);
  } catch (err) {
    console.error('Get payroll details error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch payroll details' });
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const emp = db.prepare(`
      SELECT e.*, q.quarry_name
      FROM employees e
      LEFT JOIN quarries q ON e.primary_quarry_id = q.id
      WHERE e.id = ? AND e.org_id = ?
    `).get(req.params.id, req.user.orgId);
    if (!emp) return res.status(404).json({ error: 'Not Found', message: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    console.error('Get employee error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch employee' });
  }
});

// POST /api/employees
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const {
      empName, primaryQuarryId, department, designation, employmentType,
      dateOfJoining, uanNo, esiNo, pan, aadhaarMasked,
      bankName, bankAccountNo, bankIfsc, basicSalary
    } = req.body;

    if (!empName) return res.status(400).json({ error: 'Bad Request', message: 'empName is required' });

    const count = db.prepare(`SELECT COUNT(*) as c FROM employees WHERE org_id = ?`).get(req.user.orgId).c;
    const empCode = `EMP${String(count + 1).padStart(4, '0')}`;

    const result = db.prepare(`
      INSERT INTO employees (
        org_id, emp_code, emp_name, primary_quarry_id, department, designation,
        employment_type, date_of_joining, uan_no, esi_no, pan, aadhaar_masked,
        bank_name, bank_account_no, bank_ifsc, basic_salary, active
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
    `).run(
      req.user.orgId, empCode, empName, primaryQuarryId || null, department || null,
      designation || null, employmentType || 'permanent', dateOfJoining || null,
      uanNo || null, esiNo || null, pan || null, aadhaarMasked || null,
      bankName || null, bankAccountNo || null, bankIfsc || null, basicSalary || 0
    );

    res.status(201).json(db.prepare(`SELECT * FROM employees WHERE id = ?`).get(result.lastInsertRowid));
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id
router.put('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const emp = db.prepare(`SELECT id FROM employees WHERE id = ? AND org_id = ?`).get(req.params.id, req.user.orgId);
    if (!emp) return res.status(404).json({ error: 'Not Found', message: 'Employee not found' });

    const {
      empName, primaryQuarryId, department, designation, employmentType,
      dateOfJoining, dateOfExit, uanNo, esiNo, pan, aadhaarMasked,
      bankName, bankAccountNo, bankIfsc, basicSalary, active
    } = req.body;

    db.prepare(`
      UPDATE employees SET
        emp_name = COALESCE(?, emp_name), primary_quarry_id = COALESCE(?, primary_quarry_id),
        department = COALESCE(?, department), designation = COALESCE(?, designation),
        employment_type = COALESCE(?, employment_type), date_of_joining = COALESCE(?, date_of_joining),
        date_of_exit = COALESCE(?, date_of_exit), uan_no = COALESCE(?, uan_no),
        esi_no = COALESCE(?, esi_no), pan = COALESCE(?, pan),
        aadhaar_masked = COALESCE(?, aadhaar_masked), bank_name = COALESCE(?, bank_name),
        bank_account_no = COALESCE(?, bank_account_no), bank_ifsc = COALESCE(?, bank_ifsc),
        basic_salary = COALESCE(?, basic_salary), active = COALESCE(?, active)
      WHERE id = ?
    `).run(
      empName, primaryQuarryId, department, designation, employmentType,
      dateOfJoining, dateOfExit, uanNo, esiNo, pan, aadhaarMasked,
      bankName, bankAccountNo, bankIfsc, basicSalary, active,
      req.params.id
    );

    res.json(db.prepare(`SELECT * FROM employees WHERE id = ?`).get(req.params.id));
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update employee' });
  }
});

export default router;
