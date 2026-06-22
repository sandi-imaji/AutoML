'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getConfig } from '@/lib/api'
import { Copy, Eye, EyeOff } from 'lucide-react'

// Komponen Password Input dengan Copy Button
function PasswordInput({ id, value, onChange, placeholder = "" }) {
  const [showPassword, setShowPassword] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || '')
      toast.success('Copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="pr-20"
      />
      <div className="absolute right-0 top-0 h-full flex items-center">
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="px-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="px-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="Copy to clipboard"
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [config, setConfig] = useState({
    sl_host: '',
    sl_key: '',
    sl_token: '',
    sl_retry: '',
    sl_timeout: '',
    influxdb_token: '',
    influxdb_org: '',
    influxdb_bucket: '',
  })
  const [loading, setLoading] = useState(true)

  // Fetch config dari backend saat mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await getConfig()
        setConfig({
          sl_host: data.sl_host || '',
          sl_key: data.sl_key || '',
          sl_token: data.sl_token || '',
          sl_retry: data.sl_retry?.toString() || '',
          sl_timeout: data.sl_timeout?.toString() || '',
          influxdb_token: data.influxdb_token || '',
          influxdb_org: data.influxdb_org || '',
          influxdb_bucket: data.influxdb_bucket || '',
        })
      } catch (error) {
        toast.error('Failed to load configuration')
        console.error('Error fetching config:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const handleChange = (field) => (e) => {
    setConfig(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const handleSave = () => {
    // TODO: Implement save ke backend jika diperlukan
    toast.success('Settings saved successfully')
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Loading configuration...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your AutoML platform settings
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Smartlink Configuration</CardTitle>
          <CardDescription>Configure your Smartlink connection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sl_host">SL Host</Label>
            <Input
              id="sl_host"
              value={config.sl_host}
              onChange={handleChange('sl_host')}
              placeholder="https://example.com/"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sl_token">SL Token</Label>
            <PasswordInput
              id="sl_token"
              value={config.sl_token}
              onChange={handleChange('sl_token')}
              placeholder="Enter SL Token"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sl_key">SL Key</Label>
            <PasswordInput
              id="sl_key"
              value={config.sl_key}
              onChange={handleChange('sl_key')}
              placeholder="Enter SL Key"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sl_retry">SL Retry</Label>
            <Input
              id="sl_retry"
              type="number"
              value={config.sl_retry}
              onChange={handleChange('sl_retry')}
              placeholder="3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sl_timeout">SL Timeout</Label>
            <Input
              id="sl_timeout"
              type="number"
              value={config.sl_timeout}
              onChange={handleChange('sl_timeout')}
              placeholder="6"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>InfluxDB Configuration</CardTitle>
          <CardDescription>Configure your InfluxDB storage settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="influxdb_bucket">Bucket</Label>
            <Input
              id="influxdb_bucket"
              value={config.influxdb_bucket}
              onChange={handleChange('influxdb_bucket')}
              placeholder="ml-buckets"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="influxdb_org">Organization</Label>
            <Input
              id="influxdb_org"
              value={config.influxdb_org}
              onChange={handleChange('influxdb_org')}
              placeholder="tech"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="influxdb_token">Token</Label>
            <PasswordInput
              id="influxdb_token"
              value={config.influxdb_token}
              onChange={handleChange('influxdb_token')}
              placeholder="Enter InfluxDB Token"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-[#206bc4] hover:bg-[#1a5ba3]">
          Save Changes
        </Button>
      </div>
    </div>
  )
}
