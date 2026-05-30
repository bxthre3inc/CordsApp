const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.enabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async send({ to, subject, html }) {
    if (!this.enabled) {
      console.log(`[Email disabled] To: ${to} | Subject: ${subject}`);
      return;
    }
    await this.transporter.sendMail({
      from: `"Cords" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }

  async orderPlaced(supplierEmail, order) {
    await this.send({
      to: supplierEmail,
      subject: `New order: ${order.wood_type} × ${order.quantity}`,
      html: `
        <h2>New Order Received</h2>
        <p>You have a new order on Cords.</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px">
          <tr><td style="padding:6px 0;color:#6b7280">Wood type</td><td><strong>${order.wood_type} × ${order.quantity} ${order.unit || 'cords'}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Buyer</td><td>${order.buyer_name || 'See dashboard'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Order value</td><td><strong>$${parseFloat(order.total_price).toFixed(2)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Delivery type</td><td>${order.delivery_type || 'standard'}</td></tr>
          ${order.stacking_fee > 0 ? `<tr><td style="padding:6px 0;color:#6b7280">Stacking</td><td>Yes — $${parseFloat(order.stacking_fee).toFixed(2)}</td></tr>` : ''}
        </table>
        <p>Log in to your supplier dashboard to confirm this order.</p>
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/supplier" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Order</a>
      `,
    });
  }

  async orderConfirmed(buyerEmail, order) {
    await this.send({
      to: buyerEmail,
      subject: `Your order has been confirmed`,
      html: `
        <h2>Order Confirmed</h2>
        <p>Great news — your order of <strong>${order.wood_type} × ${order.quantity}</strong> has been confirmed by the supplier.</p>
        <p>A driver will be assigned and you'll be notified when it's on its way.</p>
        ${order.gate_code ? `<p style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px"><strong>Gate / Door Code:</strong> <span style="font-family:monospace;font-size:1.1em">${order.gate_code}</span></p>` : ''}
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/orders" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Track Order</a>
      `,
    });
  }

  async orderInTransit(buyerEmail, order) {
    await this.send({
      to: buyerEmail,
      subject: `Your wood is on the way!`,
      html: `
        <h2>Out for Delivery</h2>
        <p>Your <strong>${order.wood_type} × ${order.quantity}</strong> is on its way.</p>
        ${order.gate_code ? `<p style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px"><strong>Gate / Door Code:</strong> <span style="font-family:monospace;font-size:1.1em">${order.gate_code}</span></p>` : ''}
        ${order.delivery_notes ? `<p style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px"><strong>Delivery Notes:</strong> ${order.delivery_notes}</p>` : ''}
      `,
    });
  }

  async orderDelivered(buyerEmail, order) {
    await this.send({
      to: buyerEmail,
      subject: `Delivery complete — enjoy your firewood!`,
      html: `
        <h2>Delivery Complete</h2>
        <p>Your order of <strong>${order.wood_type} × ${order.quantity}</strong> has been delivered.</p>
        <p>We hope you enjoy it. If you have any issues, contact us through your dashboard.</p>
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/orders" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Receipt</a>
      `,
    });
  }
}

module.exports = new EmailService();
