const { MongoClient } = require('mongodb');

const names = [
  "James Smith", "Mary Johnson", "John Williams", "Patricia Brown", "Robert Jones", 
  "Jennifer Garcia", "Michael Miller", "Linda Davis", "William Rodriguez", "Elizabeth Martinez", 
  "David Hernandez", "Barbara Lopez", "Richard Gonzalez", "Susan Wilson", "Joseph Anderson", 
  "Jessica Thomas", "Thomas Taylor", "Sarah Moore", "Charles Jackson", "Karen Martin", 
  "Christopher Lee", "Lisa Perez", "Daniel Thompson", "Nancy White", "Matthew Harris", 
  "Betty Sanchez", "Anthony Clark", "Margaret Ramirez", "Mark Lewis", "Sandra Robinson", 
  "Donald Walker", "Ashley Young", "Steven Allen", "Kimberly King", "Paul Wright", 
  "Emily Scott", "Andrew Torres", "Donna Nguyen", "Joshua Hill", "Michelle Flores", 
  "Kenneth Green", "Carol Adams", "Kevin Nelson", "Amanda Baker", "Brian Hall", 
  "Melissa Rivera", "George Campbell", "Deborah Mitchell", "Edward Carter", "Stephanie Roberts"
];

const generateName = (index) => {
  return names[index % names.length];
};

async function updateNames() {
  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('finguard');
    
    // Update customers collection
    const customersCollection = db.collection('customers');
    const customers = await customersCollection.find({}).toArray();
    
    let updated = 0;
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      // Generate a realistic name based on customer index or id
      const name = generateName(i);
      await customersCollection.updateOne(
        { _id: c._id },
        { $set: { name: name } }
      );
      updated++;
    }
    console.log(`Updated ${updated} customers with real names.`);

    // Update alerts collection to match
    const alertsCollection = db.collection('alerts');
    const alerts = await alertsCollection.find({}).toArray();
    let alertsUpdated = 0;
    for (let i = 0; i < alerts.length; i++) {
      const a = alerts[i];
      // Find matching customer name
      const c = customers.find(cust => cust.customerId === a.customerId);
      if (c) {
        const cIndex = customers.indexOf(c);
        await alertsCollection.updateOne(
          { _id: a._id },
          { $set: { customer_name: generateName(cIndex) } }
        );
        alertsUpdated++;
      }
    }
    console.log(`Updated ${alertsUpdated} alerts with real customer names.`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

updateNames();
