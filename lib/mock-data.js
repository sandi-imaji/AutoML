// Mock data for AutoML Dashboard

export const statsData = {
  totalModels: 247,
  activeJobs: 12,
  successRate: 94.3,
  avgAccuracy: 87.6
}

export const trainingHistory = [
  { date: '2025-01', models: 45 },
  { date: '2025-02', models: 62 },
  { date: '2025-03', models: 78 },
  { date: '2025-04', models: 89 },
  { date: '2025-05', models: 103 },
  { date: '2025-06', models: 125 }
]

export const modelPerformance = [
  { name: 'Random Forest', accuracy: 92.5, f1Score: 91.2 },
  { name: 'XGBoost', accuracy: 94.3, f1Score: 93.8 },
  { name: 'LightGBM', accuracy: 93.7, f1Score: 92.9 },
  { name: 'Neural Network', accuracy: 89.4, f1Score: 88.6 },
  { name: 'SVM', accuracy: 87.8, f1Score: 86.5 },
  { name: 'Logistic Regression', accuracy: 85.2, f1Score: 84.1 }
]

export const recentActivities = [
  {
    id: 1,
    projectName: 'Customer Churn Prediction',
    action: 'Training completed',
    timestamp: '2 minutes ago',
    status: 'completed'
  },
  {
    id: 2,
    projectName: 'Sales Forecasting Q2',
    action: 'Model deployed',
    timestamp: '15 minutes ago',
    status: 'completed'
  },
  {
    id: 3,
    projectName: 'Fraud Detection v2',
    action: 'Training started',
    timestamp: '1 hour ago',
    status: 'running'
  },
  {
    id: 4,
    projectName: 'Product Recommendation',
    action: 'Failed - insufficient data',
    timestamp: '2 hours ago',
    status: 'failed'
  },
  {
    id: 5,
    projectName: 'Credit Risk Assessment',
    action: 'Queued for training',
    timestamp: '3 hours ago',
    status: 'queued'
  }
]

export const projectsData = [
  {
    id: 'prj-001',
    name: 'Customer Churn Prediction',
    dataset: 'customer_data.csv',
    target: 'churn',
    algorithm: 'XGBoost',
    status: 'completed',
    accuracy: 94.3,
    createdAt: '2025-06-15T10:30:00Z'
  },
  {
    id: 'prj-002',
    name: 'Sales Forecasting Q2',
    dataset: 'sales_history.csv',
    target: 'revenue',
    algorithm: 'LightGBM',
    status: 'running',
    accuracy: null,
    createdAt: '2025-06-16T09:15:00Z'
  },
  {
    id: 'prj-003',
    name: 'Fraud Detection v2',
    dataset: 'transactions.csv',
    target: 'is_fraud',
    algorithm: 'Random Forest',
    status: 'running',
    accuracy: null,
    createdAt: '2025-06-16T14:20:00Z'
  },
  {
    id: 'prj-004',
    name: 'Product Recommendation',
    dataset: 'user_behavior.csv',
    target: 'purchase_intent',
    algorithm: 'Neural Network',
    status: 'failed',
    accuracy: null,
    createdAt: '2025-06-14T08:45:00Z'
  },
  {
    id: 'prj-005',
    name: 'Credit Risk Assessment',
    dataset: 'credit_history.csv',
    target: 'default_risk',
    algorithm: 'XGBoost',
    status: 'queued',
    accuracy: null,
    createdAt: '2025-06-16T16:00:00Z'
  },
  {
    id: 'prj-006',
    name: 'Sentiment Analysis',
    dataset: 'reviews.csv',
    target: 'sentiment',
    algorithm: 'BERT',
    status: 'completed',
    accuracy: 91.7,
    createdAt: '2025-06-13T11:00:00Z'
  },
  {
    id: 'prj-007',
    name: 'Stock Price Prediction',
    dataset: 'stock_data.csv',
    target: 'close_price',
    algorithm: 'LSTM',
    status: 'completed',
    accuracy: 88.4,
    createdAt: '2025-06-12T15:30:00Z'
  },
  {
    id: 'prj-008',
    name: 'Image Classification',
    dataset: 'images.zip',
    target: 'category',
    algorithm: 'CNN',
    status: 'running',
    accuracy: null,
    createdAt: '2025-06-16T13:45:00Z'
  },
  {
    id: 'prj-009',
    name: 'Energy Consumption Forecast',
    dataset: 'energy_data.csv',
    target: 'consumption',
    algorithm: 'LSTM',
    status: 'running',
    accuracy: 92.1,
    createdAt: '2025-06-16T14:00:00Z',
    task_type: 'Time Series'
  }
]

export const getProjectDetail = (projectId) => {
  if (projectId === 'prj-009') {
    return {
      id: 'prj-009',
      name: 'Energy Consumption Forecast',
      dataset: 'energy_data.csv',
      target: 'consumption',
      problemType: 'Time Series',
      task_type: 'Time Series',
      status: 'running',
      accuracy: 92.1,
      createdAt: '2025-06-16T14:00:00Z',
      completedAt: null,
      description: 'Real-time forecasting of energy consumption patterns',
      models: [
        {
          id: 1,
          name: 'LSTM',
          accuracy: 92.1,
          precision: 91.5,
          recall: 92.8,
          f1Score: 92.1,
          trainTime: '25m 15s',
          status: 'completed'
        },
        {
          id: 2,
          name: 'GRU',
          accuracy: 91.3,
          precision: 90.8,
          recall: 91.9,
          f1Score: 91.3,
          trainTime: '22m 40s',
          status: 'completed'
        }
      ]
    }
  }
  
  return {
    id: 'prj-001',
    name: 'Customer Churn Prediction',
    dataset: 'customer_data.csv',
    target: 'churn',
    problemType: 'Classification',
    task_type: 'Classification',
    status: 'completed',
    accuracy: 94.3,
    createdAt: '2025-06-15T10:30:00Z',
    completedAt: '2025-06-15T11:45:00Z',
    description: 'Predicting customer churn based on usage patterns and demographics',
    models: [
    {
      id: 1,
      name: 'XGBoost',
      accuracy: 94.3,
      precision: 93.1,
      recall: 94.8,
      f1Score: 93.9,
      trainTime: '12m 34s',
      status: 'completed'
    },
    {
      id: 2,
      name: 'Random Forest',
      accuracy: 92.5,
      precision: 91.2,
      recall: 93.1,
      f1Score: 92.1,
      trainTime: '8m 12s',
      status: 'completed'
    },
    {
      id: 3,
      name: 'LightGBM',
      accuracy: 93.7,
      precision: 92.8,
      recall: 94.2,
      f1Score: 93.5,
      trainTime: '10m 45s',
      status: 'completed'
    },
    {
      id: 4,
      name: 'Logistic Regression',
      accuracy: 85.2,
      precision: 83.5,
      recall: 86.4,
      f1Score: 84.9,
      trainTime: '3m 21s',
      status: 'completed'
    }
  ]
  }
}

export const projectDetail = getProjectDetail('prj-001')

export const mockLogs = [
  { id: 1, timestamp: '2025-06-16 10:30:15', level: 'info', message: 'Starting data preprocessing...' },
  { id: 2, timestamp: '2025-06-16 10:30:16', level: 'info', message: 'Loading dataset: customer_data.csv' },
  { id: 3, timestamp: '2025-06-16 10:30:18', level: 'info', message: 'Dataset loaded: 10,000 rows, 25 columns' },
  { id: 4, timestamp: '2025-06-16 10:30:20', level: 'warning', message: 'Found 125 missing values in column "age"' },
  { id: 5, timestamp: '2025-06-16 10:30:22', level: 'info', message: 'Applying missing value imputation...' },
  { id: 6, timestamp: '2025-06-16 10:30:25', level: 'info', message: 'Feature engineering completed' },
  { id: 7, timestamp: '2025-06-16 10:30:27', level: 'info', message: 'Splitting data: 80% train, 20% test' },
  { id: 8, timestamp: '2025-06-16 10:30:30', level: 'info', message: 'Starting model training: XGBoost' },
  { id: 9, timestamp: '2025-06-16 10:35:45', level: 'info', message: 'XGBoost training completed' },
  { id: 10, timestamp: '2025-06-16 10:35:46', level: 'info', message: 'Model accuracy: 94.3%' },
  { id: 11, timestamp: '2025-06-16 10:35:50', level: 'info', message: 'Starting model training: Random Forest' },
  { id: 12, timestamp: '2025-06-16 10:42:30', level: 'info', message: 'Random Forest training completed' },
  { id: 13, timestamp: '2025-06-16 10:42:31', level: 'info', message: 'Model accuracy: 92.5%' },
  { id: 14, timestamp: '2025-06-16 10:42:35', level: 'error', message: 'Failed to train Neural Network: insufficient memory' },
  { id: 15, timestamp: '2025-06-16 10:42:40', level: 'info', message: 'Best model selected: XGBoost (94.3%)' },
  { id: 16, timestamp: '2025-06-16 10:42:45', level: 'info', message: 'Model saved to: /models/xgboost_churn_v1.pkl' },
  { id: 17, timestamp: '2025-06-16 10:42:50', level: 'info', message: 'Training pipeline completed successfully' }
]

export const sampleCSVData = [
  { customer_id: '10001', age: 35, gender: 'M', tenure: 24, monthly_charges: 89.99, total_charges: 2159.76, churn: 0 },
  { customer_id: '10002', age: 42, gender: 'F', tenure: 36, monthly_charges: 120.50, total_charges: 4338.00, churn: 0 },
  { customer_id: '10003', age: 28, gender: 'M', tenure: 12, monthly_charges: 65.25, total_charges: 783.00, churn: 1 },
  { customer_id: '10004', age: 51, gender: 'F', tenure: 48, monthly_charges: 145.00, total_charges: 6960.00, churn: 0 },
  { customer_id: '10005', age: 33, gender: 'M', tenure: 6, monthly_charges: 55.00, total_charges: 330.00, churn: 1 },
  { customer_id: '10006', age: 45, gender: 'F', tenure: 60, monthly_charges: 98.75, total_charges: 5925.00, churn: 0 },
  { customer_id: '10007', age: 29, gender: 'M', tenure: 18, monthly_charges: 72.50, total_charges: 1305.00, churn: 0 },
  { customer_id: '10008', age: 38, gender: 'F', tenure: 24, monthly_charges: 105.00, total_charges: 2520.00, churn: 1 },
  { customer_id: '10009', age: 55, gender: 'M', tenure: 72, monthly_charges: 135.25, total_charges: 9738.00, churn: 0 },
  { customer_id: '10010', age: 31, gender: 'F', tenure: 9, monthly_charges: 48.99, total_charges: 440.91, churn: 1 }
]
