const express = require('express');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');
const app = express();
app.use(express.json());

const serviceAccount = require('./your-firebase-credentials.json'); // Replace with your JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

app.post('/webhook', async (req, res) => {
  const agent = new WebhookClient({request: req, response: res});
  const session = req.body.session || '';
  const uid = session.split('/').pop();

  async function checkBalance(agent) {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      const balance = doc.data().totalBalance || 0;
      agent.add(`Your current balance is ₹${balance.toFixed(2)}.`);
    } else {
      agent.add("Sorry, no balance found.");
    }
  }

  async function checkExpenses(agent) {
    const snapshot = await db.collection('expenses').where('userId', '==', uid).get();
    const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    agent.add(`You've spent ₹${total.toFixed(2)}.`);
  }

  const intentMap = new Map();
  intentMap.set('CheckBalanceIntent', checkBalance);
  intentMap.set('TotalExpenseIntent', checkExpenses);

  agent.handleRequest(intentMap);
});

app.listen(3000, () => console.log('Dialogflow webhook running on port 3000'));
