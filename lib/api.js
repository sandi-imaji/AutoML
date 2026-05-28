// API utilities for AutoML Dashboard

const HOST = process.env.NEXT_PUBLIC_HOST_MAIN || process.env.HOST_MAIN || '0.0.0.0'
const PORT = process.env.NEXT_PUBLIC_PORT_MAIN || process.env.PORT_MAIN || '8004'

export const API_BASE_URL = `http://${HOST}:${PORT}`
export const WS_BASE_URL = `ws://${HOST}:${PORT}`

async function GET_W_PARAMS(params={}){}
async function POST(body={}){}


/**
 * Fetch raw tagnames dari API
 * @returns {Promise<Array>} Array of tagname objects
 */
export async function getTagnames() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const res = await fetch(`${API_BASE_URL}/datasets/utils/tagnames`,
         {
      method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
      // cache: 'no-store',
    //   signal: controller.signal,
    }
    )
    clearTimeout(timeoutId)
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`)
    }
    const json = await res.json()
    // Pastikan response array
    if (!Array.isArray(json)) {
      console.error('Response bukan array:', json)
      throw new Error('Response dari API tidak valid (harus array)')
    }
    return json
  } catch (error) {
    console.error('Error fetching tagnames:', error)
    
    // Check specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - API tidak merespon')
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Tidak dapat terhubung ke API. Pastikan API server berjalan.')
    }
    
    throw error
  }
}

/**
 * Wrapper untuk available columns dengan fallback ke mock data
 * @param {boolean} useMockData - Force use mock data for development
 */
export async function fetchAvailableColumns(useMockData = false) {
  try {
    // Force mock data if requested
    if (useMockData) {
      console.log('🔧 Using mock data (development mode)')
      return getMockColumns()
    }

    console.log('📡 Fetching columns from API:', `${API_BASE_URL}/datasets/utils/tagnames`)
    
    const response = await getTagnames()

    // Normalisasi response API asli
    const normalized = response.map((item, index) => ({
      row_id: String(item.row_id ?? index + 1), // WAJIB string untuk Select
      tag_name: item.tag_name ?? `Column ${index + 1}`,
      point_id: String(item.point_id ?? ''),
    }))

    console.log(`✅ Loaded ${normalized.length} columns from API`)
    return normalized

  } catch (error) {
    console.error('❌ Error fetching columns:', error.message)
    
    // Fallback ke mock data
    console.log('⚠️ Falling back to mock data')
    return getMockColumns()
  }
}

/**
 * Create a new project
 * @param {Object} projectData - Project configuration data
 * @returns {Promise<Object>} Created project response
 */
export async function createDataset(payload) {
  console.log(payload)
  try {
    const response = await fetch(`${API_BASE_URL}/models/auto-initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating project:', error)
    throw error
  }
}

export async function getStats(){
  const response = await fetch(`${API_BASE_URL}/utils/stats`)
  // if (!response.ok) {
  //   throw new Error(`HTTP error! status: ${response.status}`)
  // }
  return response
}

/**
 * Fetch anomaly detection history
 * @returns {Promise<Response>} Response with anomaly history data
 */
export async function getAnomalyHistory(){
  const response = await fetch(`${API_BASE_URL}/models/history/anomaly`)
  return response
}

export async function getDatasets() {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status}`)
    }
    const res_json = await response.json()
    return res_json["data"]
  } catch (error) {
    console.error('Error get datasets:', error)
    throw error
  }
}

export async function getDatasetsActive(){
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status}`)
    }
    const res_json = await response.json()
    return res_json
  } catch (error) {
    console.error('Error get datasets:', error)
    throw error
  }
}

export async function getDataset(dataset_name){
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/${dataset_name}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error get datasets:', error)
    throw error
  }
}

export async function deleteDataset(dataset_name){
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/${dataset_name}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error deleting dataset:', error)
    throw error
  }
}

/**
 * Start prediction task for a dataset
 * @param {string} dataset_name - Dataset name
 * @returns {Promise<Object>} Response with task info including task_id
 */
export async function startTask(dataset_name,task_type) {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/create?dataset_name=${encodeURIComponent(dataset_name)}&task_type=${encodeURIComponent(dataset_name)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error starting task:', error)
    throw error
  }
}

/**
 * Stop prediction task by dataset_name
 * @param {string} dataset_name - Dataset name
 * @returns {Promise<Object>} Response with confirmation
 */
export async function stopTask(dataset_name,task_type) {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/stop-by-dataset?dataset_name=${encodeURIComponent(dataset_name)}&task_type=${encodeURIComponent(task_type)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error stopping task:', error)
    throw error
  }
}

/**
 * Get worker status for a specific dataset
 * @param {string} dataset_name - Dataset name
 * @returns {Promise<Object>} Response with worker status
 */
export async function getRunningTasksByDataset(dataset_name) {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/${encodeURIComponent(dataset_name)}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting worker status:', error)
    throw error
  }
}

/**
 * Get all workers status
 * @returns {Promise<Object>} Response with workers status list
 */
export async function getTasksList() {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting workers status:', error)
    throw error
  }
}

/**
 * Get predictions from predictions.csv
 * @param {string} dataset_name - Dataset name
 * @param {Object} options - Query options (limit, from_date, to_date)
 * @returns {Promise<Object>} Response with predictions data
 */
export async function getPredictions(dataset_name, options = {}) {
  try {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit)
    if (options.from_date) params.append('from_date', options.from_date)
    if (options.to_date) params.append('to_date', options.to_date)

    const queryString = params.toString()
    const url = `${API_BASE_URL}/datasets/${encodeURIComponent(dataset_name)}/predictions${queryString ? '?' + queryString : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting predictions:', error)
    throw error
  }
}

export async function getPredictionsHistory(datasetName){
  const response = await fetch(`${API_BASE_URL}/models/${encodeURIComponent(datasetName)}/history`)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return await response.json()
}

export async function getActualForecast(datasetName){
  const response = await fetch(`${API_BASE_URL}/models/${encodeURIComponent(datasetName)}/forecast/get_actual`, {
    method: 'GET',
  })

  if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`) }

  return await response.json()
}
/**
 * Get all workers tasks
 * @returns {Promise<Array>} Array of worker task objects
 */
export async function getWorkersTasks() {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting workers tasks:', error)
    throw error
  }
}

/**
 * Stop a worker task
 * @param {string} task_name - Task name to stop
 * @returns {Promise<Object>} Response with confirmation
 */
export async function stopWorkerTask(task_name) {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/stop?task_name=${encodeURIComponent(task_name)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error stopping worker task:', error)
    throw error
  }
}

/**
 * Delete a worker task
 * @param {string} task_name - Task name to delete
 * @returns {Promise<Object>} Response with confirmation
 */
export async function deleteWorkerTask(task_name) {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/delete?task_name=${encodeURIComponent(task_name)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error deleting worker task:', error)
    throw error
  }
}

/**
 * Start a worker task
 * @param {string} task_name - Task name to start
 * @returns {Promise<Object>} Response with confirmation
 */
export async function startWorkerTask(task_name) {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/start?task_name=${encodeURIComponent(task_name)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error starting worker task:', error)
    throw error
  }
}


/**
 * Run anomaly detection on a dataset
 * @param {Object} params - Anomaly detection parameters
 * @param {string} params.dataset_name - Dataset name
 * @param {string} params.algorithm - Algorithm to use (e.g., 'iforest', 'lof', etc.)
 * @param {number} params.fraction - Anomaly fraction (0.0 - 1.0)
 * @returns {Promise<Object>} Response with anomaly detection results
 */
export async function runAnomalyDetection({ dataset_name, algorithm, fraction }) {
  try {
    const response = await fetch(`${API_BASE_URL}/models/anomaly/auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset_name,
        algorithm,
        fraction,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error running anomaly detection:', error)
    throw error
  }
}

/**
 * Get unique cluster names for a dataset
 * @param {string} dataset_name - Dataset name
 * @returns {Promise Object>} Response with sc and kmeans cluster names
 */
export async function getClusterNames(dataset_name) {
  try {
    const response = await fetch(`${API_BASE_URL}/utils/clusters/unique?dataset_name=${encodeURIComponent(dataset_name)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Cluster names fetched:', data)
    return data
  } catch (error) {
    console.error('❌ Error fetching cluster names:', error)
    throw error
  }
}

/**
 * Update cluster names for a dataset
 * @param {string} dataset_name - Dataset name
 * @param {Object} data_naming - Object containing sc and kmeans cluster mappings
 * @returns {Promise Object>} Response with confirmation
 */
export async function updateClusterNames(dataset_name, data_naming) {
  try {
    const response = await fetch(`${API_BASE_URL}/utils/clusters/unique?dataset_name=${encodeURIComponent(dataset_name)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data_naming }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Cluster names updated:', data)
    return data
  } catch (error) {
    console.error('❌ Error updating cluster names:', error)
    throw error
  }
}

export async function searchTags(searchQuery) {
  try {
    if (!searchQuery || searchQuery.trim().length < 3) {
      return []
    }

    const cleanQuery = searchQuery.trim()
    console.log('🚀 Calling proxy API with query:', cleanQuery)

    // Call API directly
    const response = await fetch(`${API_BASE_URL}/datasets/utils/tagname?query=${encodeURIComponent(cleanQuery)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('📥 Proxy response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Proxy API error:', errorData)
      throw new Error(errorData.message || `API error: ${response.status}`)
    }

    const responseData = await response.json()
    console.log('📦 Proxy response data:', responseData)

    // Extract data array from response
    // Handle both { data: [...] } and plain array [...] formats
    const data = Array.isArray(responseData) ? responseData : (responseData.data || [])

    // Normalize response format - handle both string array and object array
    const normalized = data.map((item, index) => {
      if (typeof item === 'string') {
        // API returns array of strings
        return {
          row_id: String(index),
          tag_name: item,
        }
      }
      // API returns array of objects
      return {
        row_id: String(item.id ?? index),
        tag_name: item.text ?? item,
      }
    })

    console.log('✅ Normalized data:', normalized)
    return normalized

  } catch (error) {
    console.error('❌ Error searching tags:', error)
    throw error
  }
}
