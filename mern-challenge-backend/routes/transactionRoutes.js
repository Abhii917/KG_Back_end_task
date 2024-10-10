const express = require('express');
const axios = require('axios');
const Transaction = require('../models/Transaction');

const router = express.Router();

// 1. Fetch data from third-party API and initialize the database
router.get('/seed', async (req, res) => {
  try {
    const { data } = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    await Transaction.insertMany(data);
    res.status(201).send('Database seeded successfully!');
  } catch (error) {
    res.status(500).send('Error seeding the database');
  }
});

// 2. List transactions with search and pagination
router.get('/transactions', async (req, res) => {
  const { search = '', page = 1, perPage = 10, month } = req.query;

  const searchCriteria = {
    dateOfSale: { $regex: new RegExp(`^${month}`, 'i') }, // Match by month
    $or: [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { price: { $regex: search, $options: 'i' } },
    ]
  };

  try {
    const transactions = await Transaction.find(searchCriteria)
      .skip((page - 1) * perPage)
      .limit(Number(perPage));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// 3. Statistics API
router.get('/statistics', async (req, res) => {
  const { month } = req.query;

  try {
    const transactions = await Transaction.find({ dateOfSale: { $regex: new RegExp(`^${month}`, 'i') } });

    const totalSales = transactions.reduce((sum, transaction) => sum + transaction.price, 0);
    const totalSoldItems = transactions.filter(transaction => transaction.sold).length;
    const totalNotSoldItems = transactions.filter(transaction => !transaction.sold).length;

    res.json({ totalSales, totalSoldItems, totalNotSoldItems });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// 4. Bar chart API
router.get('/bar-chart', async (req, res) => {
  const { month } = req.query;

  try {
    const transactions = await Transaction.find({ dateOfSale: { $regex: new RegExp(`^${month}`, 'i') } });

    const priceRanges = {
      '0-100': 0,
      '101-200': 0,
      '201-300': 0,
      '301-400': 0,
      '401-500': 0,
      '501-600': 0,
      '601-700': 0,
      '701-800': 0,
      '801-900': 0,
      '901-above': 0,
    };

    transactions.forEach(transaction => {
      if (transaction.price <= 100) priceRanges['0-100']++;
      else if (transaction.price <= 200) priceRanges['101-200']++;
      else if (transaction.price <= 300) priceRanges['201-300']++;
      else if (transaction.price <= 400) priceRanges['301-400']++;
      else if (transaction.price <= 500) priceRanges['401-500']++;
      else if (transaction.price <= 600) priceRanges['501-600']++;
      else if (transaction.price <= 700) priceRanges['601-700']++;
      else if (transaction.price <= 800) priceRanges['701-800']++;
      else if (transaction.price <= 900) priceRanges['801-900']++;
      else priceRanges['901-above']++;
    });

    res.json(priceRanges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bar chart data' });
  }
});

// 5. Pie chart API
router.get('/pie-chart', async (req, res) => {
  const { month } = req.query;

  try {
    const transactions = await Transaction.find({ dateOfSale: { $regex: new RegExp(`^${month}`, 'i') } });

    const categories = {};
    transactions.forEach(transaction => {
      categories[transaction.category] = (categories[transaction.category] || 0) + 1;
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pie chart data' });
  }
});

module.exports = router;
