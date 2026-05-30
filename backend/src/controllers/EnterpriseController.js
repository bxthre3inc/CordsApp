const pool = require('../config/database');

/*
  Enterprise pricing model:
  - No platform commission on orders
  - Custom monthly_fee + per_cord_fee billed via Stripe invoice
  - If delivers=true: per_mile_fee negotiated; supplier charges buyer, Cords takes cut
  - Card processing (Stripe 2.9% + $0.30) passed through to enterprise supplier

  Unit economics at avg $285/cord:
  ┌──────────────────┬──────────────┬────────────────┬──────────────────────────┐
  │ Tier             │ Monthly cost │ Per-order cost │ Platform net per cord    │
  ├──────────────────┼──────────────┼────────────────┼──────────────────────────┤
  │ Free (20%)       │ $0           │ 20% of order   │ ~$48 net on $285 cord    │
  │ Starter (10%)    │ $29.99       │ 10% of order   │ ~$24 net + $30/mo        │
  │ Professional (5%)│ $99.99       │ 5% of order    │ ~$4 net + $100/mo        │
  │ Enterprise       │ negotiated   │ $0 commission  │ monthly_fee + per_cord   │
  └──────────────────┴──────────────┴────────────────┴──────────────────────────┘

  Suggested enterprise starting points (all negotiable):
    Small  (50-150 cords/mo):  $299/mo  + $3.00/cord  = $449-$749/mo to Cords
    Medium (150-500 cords/mo): $699/mo  + $2.50/cord  = $1,074-$1,949/mo to Cords
    Large  (500+ cords/mo):    $999/mo  + $2.00/cord  = $1,999+/mo to Cords

  Delivery per-mile (if enterprise delivers):
    Platform cut: $0.25-$0.50/mile
    Enterprise charges buyer: negotiated (suggested $1.25-$2.50/mile)
*/

class EnterpriseController {
  // Public: submit a lead (contact form, no auth required)
  static async submitLead(req, res) {
    try {
      const { companyName, contactName, contactEmail, contactPhone, estimatedMonthlyCords, delivers, notes } = req.body;

      if (!companyName || !contactName || !contactEmail) {
        return res.status(400).json({ error: 'Company name, contact name, and email are required' });
      }

      await pool.query(`
        INSERT INTO enterprise_leads (company_name, contact_name, contact_email, contact_phone, estimated_monthly_cords, delivers, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [companyName, contactName, contactEmail, contactPhone, estimatedMonthlyCords, delivers || false, notes]);

      res.status(201).json({ message: 'Thanks! Our team will reach out within 1 business day.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to submit inquiry' });
    }
  }

  // Supplier: get own enterprise contract
  static async getMyContract(req, res) {
    try {
      const { userId } = req.user;
      const result = await pool.query(
        'SELECT * FROM enterprise_contracts WHERE user_id = $1',
        [userId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'No enterprise contract found' });
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch contract' });
    }
  }

  // Admin: list all leads
  static async getLeads(req, res) {
    try {
      const { status } = req.query;
      let query = 'SELECT * FROM enterprise_leads WHERE 1=1';
      const params = [];
      if (status) { params.push(status); query += ` AND status = $${params.length}`; }
      query += ' ORDER BY created_at DESC';
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  }

  // Admin: update lead status
  static async updateLead(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await pool.query('UPDATE enterprise_leads SET status = $1 WHERE id = $2', [status, id]);
      res.json({ message: 'Lead updated' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  }

  // Admin: list all active contracts
  static async getContracts(req, res) {
    try {
      const result = await pool.query(`
        SELECT ec.*, u.email, u.first_name, u.last_name
        FROM enterprise_contracts ec
        JOIN users u ON ec.user_id = u.id
        ORDER BY ec.created_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  }

  // Admin: create or update enterprise contract for a supplier user
  static async upsertContract(req, res) {
    try {
      const { userId, companyName, contactName, contactEmail, monthlyFee, perCordFee, perMileFee, delivers, notes, startDate, endDate } = req.body;

      if (!userId || !monthlyFee || !perCordFee) {
        return res.status(400).json({ error: 'userId, monthlyFee, and perCordFee are required' });
      }

      const result = await pool.query(`
        INSERT INTO enterprise_contracts
          (user_id, company_name, contact_name, contact_email, monthly_fee, per_cord_fee, per_mile_fee, delivers, notes, status, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
        ON CONFLICT (user_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          contact_name = EXCLUDED.contact_name,
          contact_email = EXCLUDED.contact_email,
          monthly_fee = EXCLUDED.monthly_fee,
          per_cord_fee = EXCLUDED.per_cord_fee,
          per_mile_fee = EXCLUDED.per_mile_fee,
          delivers = EXCLUDED.delivers,
          notes = EXCLUDED.notes,
          status = 'active',
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          updated_at = NOW()
        RETURNING *
      `, [userId, companyName, contactName, contactEmail, monthlyFee, perCordFee, perMileFee || null, delivers || false, notes, startDate || null, endDate || null]);

      // Upgrade supplier profile to enterprise
      await pool.query(`
        INSERT INTO supplier_profiles (user_id, account_type)
        VALUES ($1, 'enterprise')
        ON CONFLICT (user_id) DO UPDATE SET account_type = 'enterprise', updated_at = NOW()
      `, [userId]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create/update contract' });
    }
  }

  // Admin: cancel an enterprise contract
  static async cancelContract(req, res) {
    try {
      const { id } = req.params;
      await pool.query(`
        UPDATE enterprise_contracts SET status = 'cancelled', updated_at = NOW() WHERE id = $1
      `, [id]);

      // Downgrade to professional
      const contract = await pool.query('SELECT user_id FROM enterprise_contracts WHERE id = $1', [id]);
      if (contract.rows[0]) {
        await pool.query(`
          UPDATE supplier_profiles SET account_type = 'professional', updated_at = NOW()
          WHERE user_id = $1
        `, [contract.rows[0].user_id]);
      }

      res.json({ message: 'Contract cancelled' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to cancel contract' });
    }
  }

  // Calculate what Cords earns from an enterprise order (for webhook / reporting)
  static calculateEnterpriseRevenue(contract, cordCount) {
    const platformRevenue = parseFloat(contract.monthly_fee || 0) / 30 + // daily portion of monthly fee
      parseFloat(contract.per_cord_fee || 0) * cordCount;
    return parseFloat(platformRevenue.toFixed(2));
  }
}

module.exports = EnterpriseController;
