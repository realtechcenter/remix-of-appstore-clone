import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ServerCog, HardDrive, Globe, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { bunnyApi, type BunnyConfig, type BunnyTestResult } from "@/lib/api";

export const BunnyStorageSetup = () => {
  const [config, setConfig] = useState<BunnyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<BunnyTestResult | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const configData = await bunnyApi.getConfig();
      setConfig(configData);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await bunnyApi.testConnection();
      setTestResult(result);
      if (result.success) {
        toast.success('Bunny Storage connection successful!');
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection test failed';
      setTestResult({ success: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Bunny Storage & CDN</h2>
            <p className="text-sm text-muted-foreground">Manage file storage and content delivery</p>
          </div>
        </div>
        <Badge variant={config?.configured ? "default" : "destructive"} className="gap-1.5">
          {config?.configured ? (
            <><CheckCircle2 className="w-3 h-3" /> Configured</>
          ) : (
            <><XCircle className="w-3 h-3" /> Not Configured</>
          )}
        </Badge>
      </div>

      {/* Configuration Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConfigCard
          icon={ServerCog}
          label="Storage Zone"
          value={config?.zone_name || 'Not set'}
          configured={!!config?.zone_name}
        />
        <ConfigCard
          icon={HardDrive}
          label="Storage Host"
          value={config?.storage_host || 'Not set'}
          configured={!!config?.storage_host}
        />
        <ConfigCard
          icon={Globe}
          label="CDN Hostname"
          value={config?.cdn_host || 'Not set'}
          configured={!!config?.cdn_host}
        />
        <ConfigCard
          icon={Shield}
          label="API Key"
          value={config?.configured ? '••••••••••••' : 'Not set'}
          configured={!!config?.configured}
        />
      </div>

      {/* Test Connection */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Connection Test</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Verify that your Bunny Storage credentials are working correctly
            </p>
          </div>
          <Button
            onClick={testConnection}
            disabled={testing || !config?.configured}
            className="gap-2"
          >
            {testing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Test Connection</>
            )}
          </Button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`rounded-lg p-4 border ${
            testResult.success
              ? 'bg-green-500/5 border-green-500/20'
              : 'bg-destructive/5 border-destructive/20'
          }`}>
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className={`font-medium text-sm ${
                  testResult.success ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                }`}>
                  {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                </p>
                {testResult.success ? (
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>Zone: <span className="font-medium text-foreground">{testResult.zone_name}</span></p>
                    <p>Host: <span className="font-medium text-foreground">{testResult.storage_host}</span></p>
                    <p>CDN: <span className="font-medium text-foreground">{testResult.cdn_host}</span></p>
                    <p>Files in root: <span className="font-medium text-foreground">{testResult.file_count}</span></p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{testResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      {!config?.configured && (
        <div className="border border-dashed border-border rounded-xl p-5 bg-muted/30">
          <h3 className="font-medium mb-2">Setup Instructions</h3>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Go to your <span className="font-medium text-foreground">Bunny.net Dashboard</span></li>
            <li>Navigate to <span className="font-medium text-foreground">Storage → Storage Zones</span></li>
            <li>Copy your <span className="font-medium text-foreground">Password (API Key)</span>, <span className="font-medium text-foreground">Zone Name</span>, and <span className="font-medium text-foreground">Hostname</span></li>
            <li>Add them to your Laravel <span className="font-medium text-foreground">.env</span> file</li>
            <li>Come back here and click <span className="font-medium text-foreground">Test Connection</span></li>
          </ol>
        </div>
      )}
    </div>
  );
};

// ─── Config Card ─────────────────────────────────────────────────────────────
const ConfigCard = ({
  icon: Icon,
  label,
  value,
  configured,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  configured: boolean;
}) => (
  <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
      configured ? 'bg-green-500/10' : 'bg-muted'
    }`}>
      <Icon className={`w-4 h-4 ${configured ? 'text-green-500' : 'text-muted-foreground'}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  </div>
);
