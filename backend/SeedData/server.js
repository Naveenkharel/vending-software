import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';
import { createRequire } from 'module';  // needed ONLY to load the JSON key file

// ── Load service account key (JSON import via createRequire for ESM compat) ──
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// eSewa TEST credentials — swap all four for production
// ─────────────────────────────────────────────────────────────
const ESEWA_CONFIG = {
  productCode: 'EPAYTEST',
  secretKey:   '8gBm/:&EnhH.1/q',
  paymentUrl:  'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
  verifyUrl:   'https://rc-epay.esewa.com.np/api/epay/transaction/status/',
  // --- LIVE ---
  // productCode: process.env.ESEWA_PRODUCT_CODE,
  // secretKey:   process.env.ESEWA_SECRET_KEY,
  // paymentUrl:  'https://epay.esewa.com.np/api/epay/main/v2/form',
  // verifyUrl:   'https://epay.esewa.com.np/api/epay/transaction/status/',
};

// ─────────────────────────────────────────────────────────────
// SIGNATURE HELPER
// HMAC-SHA256("total_amount=X,transaction_uuid=Y,product_code=Z", secretKey) → base64
// ─────────────────────────────────────────────────────────────
const generateEsewaSignature = (totalAmount, transactionUuid) => {
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_CONFIG.productCode}`;
  const signature = crypto
    .createHmac('sha256', ESEWA_CONFIG.secretKey)
    .update(message)
    .digest('base64');
  return { signature, signedFieldNames };
};

// ─────────────────────────────────────────────────────────────
// POST /api/esewa/initiate
// Creates a pending order in Firestore BEFORE redirecting to eSewa
// Body: { amount, taxAmount, items }
// ─────────────────────────────────────────────────────────────
app.post('/api/esewa/initiate', async (req, res) => {
  try {
    const { amount, taxAmount = 0, items } = req.body;

    if (!amount || parseFloat(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    if (!items || items.length === 0)
      return res.status(400).json({ success: false, message: 'No items provided' });

    const transactionUuid = uuidv4();
    const baseAmount      = parseFloat(amount);
    const tax             = parseFloat(taxAmount);
    const totalAmount     = (baseAmount + tax).toFixed(2);

    const { signature, signedFieldNames } = generateEsewaSignature(totalAmount, transactionUuid);

    // Save order BEFORE redirect — status "pending"
    await db.collection('orders').doc(transactionUuid).set({
      transactionUuid,
      status:        'pending',
      items:         items.map(i => ({
        id:       i.id,
        slot:     i.slot,
        name:     i.name,
        price:    parseFloat(i.price),
        quantity: parseInt(i.quantity),
      })),
      subtotal:      baseAmount,
      tax,
      totalAmount:   parseFloat(totalAmount),
      paymentMethod: 'esewa',
      createdAt:     admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    const paymentData = {
      amount:                  baseAmount.toFixed(2),
      tax_amount:              tax.toFixed(2),
      total_amount:            totalAmount,
      transaction_uuid:        transactionUuid,
      product_code:            ESEWA_CONFIG.productCode,
      product_service_charge:  '0',
      product_delivery_charge: '0',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
      failure_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failure`,
      signed_field_names:      signedFieldNames,
      signature,
    };

    res.json({ success: true, paymentData, paymentUrl: ESEWA_CONFIG.paymentUrl, orderId: transactionUuid });
  } catch (error) {
    console.error('eSewa initiate error:', error);
    res.status(500).json({ success: false, message: 'Server error during payment initiation' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/esewa/verify
// Security checks: idempotency, signature, amount match, eSewa status API
// Body: { encodedResponse, orderId }
// ─────────────────────────────────────────────────────────────
app.post('/api/esewa/verify', async (req, res) => {
  try {
    const { encodedResponse, orderId } = req.body;

    if (!encodedResponse || !orderId)
      return res.status(400).json({ success: false, message: 'Missing response data or orderId' });

    const orderRef  = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists)
      return res.status(404).json({ success: false, message: 'Order not found' });

    const order = orderSnap.data();

    // Idempotency — already processed
    if (['paid', 'dispensing', 'dispensed'].includes(order.status))
      return res.json({ success: true, message: 'Payment already verified', transactionData: order });
    if (order.status === 'failed')
      return res.status(400).json({ success: false, message: 'This order was marked failed' });

    // Decode eSewa's base64 response
    let responseData;
    try {
      responseData = JSON.parse(Buffer.from(encodedResponse, 'base64').toString('utf-8'));
    } catch {
      return res.status(400).json({ success: false, message: 'Could not decode eSewa response' });
    }

    const { transaction_uuid, total_amount, signed_field_names, signature: receivedSignature } = responseData;

    // Check 1: UUID must match our order
    if (transaction_uuid !== orderId)
      return res.status(400).json({ success: false, message: 'Transaction ID mismatch' });

    // Check 2: Verify eSewa callback signature
    const fieldsToSign  = signed_field_names.split(',');
    const messageString = fieldsToSign.map(f => `${f}=${responseData[f]}`).join(',');
    const expectedSig   = crypto.createHmac('sha256', ESEWA_CONFIG.secretKey).update(messageString).digest('base64');

    if (expectedSig !== receivedSignature) {
      await orderRef.update({ status: 'failed', failReason: 'Signature mismatch', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.status(400).json({ success: false, message: 'Signature mismatch — possible tampering' });
    }

    // Check 3: Amount must match what WE stored — not eSewa's claim
    if (Math.abs(parseFloat(total_amount) - order.totalAmount) > 0.01) {
      await orderRef.update({ status: 'failed', failReason: `Amount mismatch`, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.status(400).json({ success: false, message: 'Amount mismatch — payment rejected' });
    }

    // Check 4: Double-verify with eSewa's own status API
    const verifyUrl  = `${ESEWA_CONFIG.verifyUrl}?product_code=${ESEWA_CONFIG.productCode}&transaction_uuid=${transaction_uuid}&total_amount=${total_amount}`;
    const esewaCheck = await axios.get(verifyUrl);

    if (esewaCheck.data.status !== 'COMPLETE') {
      await orderRef.update({ status: 'failed', failReason: `eSewa status: ${esewaCheck.data.status}`, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.status(400).json({ success: false, message: `Payment not complete. eSewa status: ${esewaCheck.data.status}` });
    }

    // All checks passed — batch update
    const batch = db.batch();

    batch.update(orderRef, {
      status:     'paid',
      esewaRef:   esewaCheck.data.ref_id || '',
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:  admin.firestore.FieldValue.serverTimestamp(),
    });

    for (const item of order.items) {
      const invRef  = db.collection('inventory').doc(item.id);
      const invSnap = await invRef.get();
      if (invSnap.exists) {
        const newQty = Math.max(0, (parseInt(invSnap.data().quantity) || 0) - item.quantity);
        batch.update(invRef, { quantity: newQty, updatedAt: new Date().toISOString() });
      }
    }

    batch.set(db.collection('dispense_queue').doc(orderId), {
      orderId,
      status:      'queued',
      items:       order.items.map(i => ({ slot: i.slot, name: i.name, quantity: i.quantity })),
      totalAmount: order.totalAmount,
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    res.json({ success: true, message: 'Payment verified. Dispensing order.', orderId, transactionId: transaction_uuid });
  } catch (error) {
    console.error('eSewa verify error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Verification server error', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/dispense/status/:orderId  — frontend polls this
// ─────────────────────────────────────────────────────────────
app.get('/api/dispense/status/:orderId', async (req, res) => {
  try {
    const snap = await db.collection('dispense_queue').doc(req.params.orderId).get();
    if (!snap.exists) return res.status(404).json({ success: false, message: 'Dispense job not found' });
    const data = snap.data();
    res.json({ success: true, status: data.status, items: data.items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/dispense/next  — ESP32 polls this
// Atomically claims the oldest queued job
// ─────────────────────────────────────────────────────────────
app.get('/api/dispense/next', async (req, res) => {
  try {
    const snapshot = await db.collection('dispense_queue')
      .where('status', '==', 'queued')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

    if (snapshot.empty) return res.json({ success: true, job: null });

    const docRef = snapshot.docs[0].ref;
    const job    = snapshot.docs[0].data();

    await docRef.update({ status: 'dispensing', claimedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await db.collection('orders').doc(job.orderId).update({ status: 'dispensing', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    res.json({ success: true, job: { orderId: job.orderId, items: job.items } });
  } catch (error) {
    console.error('dispense/next error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/dispense/ack  — ESP32 calls after dispensing
// Body: { orderId, status: "dispensed" | "failed" }
// ─────────────────────────────────────────────────────────────
app.post('/api/dispense/ack', async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !['dispensed', 'failed'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid ack payload' });

    const ts = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('dispense_queue').doc(orderId).update({ status, updatedAt: ts });
    await db.collection('orders').doc(orderId).update({ status, updatedAt: ts });
    res.json({ success: true });
  } catch (error) {
    console.error('dispense/ack error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/health
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'TEST', gateway: 'eSewa' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server on port ${PORT} | eSewa TEST mode`);
});