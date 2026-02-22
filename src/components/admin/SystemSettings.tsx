import { useState } from 'react';
import { Settings2, Globe, Shield, Bell, Database, Server, ToggleLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SETTINGS_KEY = 'macsofy_admin_settings';

interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowNewRegistrations: boolean;
  maxUploadSize: number;
  autoApproveApps: boolean;
  siteName: string;
  supportEmail: string;
  enableAnalytics: boolean;
}

const defaultSettings: SystemSettings = {
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing scheduled maintenance. Please try again later.',
  allowNewRegistrations: true,
  maxUploadSize: 500,
  autoApproveApps: false,
  siteName: 'Macsofy',
  supportEmail: 'support@macsofy.com',
  enableAnalytics: true,
};

function loadSettings(): SystemSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function SystemSettingsPanel() {
  const [settings, setSettings] = useState<SystemSettings>(loadSettings);

  const update = (key: keyof SystemSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    toast.success('Settings saved');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
            System Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Configure global application settings</p>
        </div>
        <Button onClick={handleSave} size="sm">Save Changes</Button>
      </div>

      {/* General */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">General</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Site Name</Label>
              <Input value={settings.siteName} onChange={e => update('siteName', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Support Email</Label>
              <Input type="email" value={settings.supportEmail} onChange={e => update('supportEmail', e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Access Control</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow New Registrations</p>
              <p className="text-xs text-muted-foreground">Enable user sign-up for new accounts</p>
            </div>
            <Switch checked={settings.allowNewRegistrations} onCheckedChange={v => update('allowNewRegistrations', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-Approve App Submissions</p>
              <p className="text-xs text-muted-foreground">Skip manual review for new submissions</p>
            </div>
            <Switch checked={settings.autoApproveApps} onCheckedChange={v => update('autoApproveApps', v)} />
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Maintenance</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Users will see a maintenance page</p>
            </div>
            <Switch checked={settings.maintenanceMode} onCheckedChange={v => update('maintenanceMode', v)} />
          </div>
          {settings.maintenanceMode && (
            <div>
              <Label className="text-xs">Maintenance Message</Label>
              <Input value={settings.maintenanceMessage} onChange={e => update('maintenanceMessage', e.target.value)} className="mt-1" />
            </div>
          )}
        </div>
      </div>

      {/* Storage & Limits */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Storage & Limits</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <Label className="text-xs">Max Upload Size (MB)</Label>
            <Input type="number" value={settings.maxUploadSize} onChange={e => update('maxUploadSize', parseInt(e.target.value) || 0)} className="mt-1 w-32" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Analytics Tracking</p>
              <p className="text-xs text-muted-foreground">Collect usage and performance data</p>
            </div>
            <Switch checked={settings.enableAnalytics} onCheckedChange={v => update('enableAnalytics', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
